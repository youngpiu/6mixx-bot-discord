import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js'

import { Ticket, TicketType } from 'generated/prisma/client'
import { TicketStatus } from 'generated/prisma/enums'

import { STATIC_EMOJI } from '~/constants/emojiConstant'
import { CUSTOM_ID } from '~/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

import { TicketHelper } from '~/helpers/TicketHelper'
import { lines } from '~/utils/textUtil'

import { TicketRepository } from '~/repositories/ticketRepository'

// Types
// Represents the state of the ticket list view (filters and pagination)
export interface TicketListState {
  page: number
  type?: TicketType // Filter by ticket type
  status?: TicketStatus // Filter by ticket status
}

export interface TicketListMeta extends TicketListState {
  total: number
  totalPages: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

// Encodes the state object into a compact string for button customIds
// Format: p=1:t=BUG:s=OPEN
export const encodeState = (state: TicketListState): string => {
  const parts = [`p=${state.page}`]
  if (state.type) parts.push(`t=${state.type}`)
  if (state.status) parts.push(`s=${state.status}`)
  return parts.join(':')
}

export const decodeState = (encoded: string): TicketListState => {
  const state: TicketListState = { page: 1 }
  const parts = encoded.split(':')

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 'p') state.page = parseInt(value, 10) || 1
    if (key === 't') state.type = value as TicketType
    if (key === 's') state.status = value as TicketStatus
  }

  return state
}

// Helper to create a button with encoded state
const createButton = (
  action: string,
  state: TicketListState,
  emoji: string | undefined,
  disabled: boolean,
  style = ButtonStyle.Secondary,
  label?: string
) => {
  const customId = `${CUSTOM_ID.TICKET_LIST_PREFIX}${action}:${encodeState(state)}`
  const button = new ButtonBuilder().setCustomId(customId).setStyle(style).setDisabled(disabled)

  if (emoji) {
    button.setEmoji(emoji)
  }

  if (label) {
    button.setLabel(label)
  }

  return button
}

export class TicketListCommand {
  // Initial execution of the list command
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')

    // Fetch initial data (page 1, default limits)
    const { items, meta } = await TicketRepository.getTickets({
      guildId: interaction.guildId,
      page: 1,
      limit: 10
    })

    return await interaction.editReply(this.createListResponse(items, meta))
  }

  // Handles pagination and filter button interactions
  public static async handleButton(interaction: ButtonInteraction, state: TicketListState) {
    if (!interaction.guildId) throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')

    // Fetch data based on the state encoded in the button
    const { items, meta } = await TicketRepository.getTickets({
      guildId: interaction.guildId,
      page: state.page,
      limit: 10,
      type: state.type,
      status: state.status
    })

    await interaction.editReply(this.createListResponse(items, meta))
  }

  // Assembles the complete interaction response (Embed + Action Rows)
  public static createListResponse(tickets: Ticket[], meta: TicketListMeta) {
    return {
      embeds: [this.createEmbed(tickets, meta)],
      components: [
        this.createPagination(meta),
        this.createTypeFilter(meta),
        this.createStatusFilter(meta)
      ]
    }
  }

  // Builds the main list embed with ticket details and footer info
  private static createEmbed(tickets: Ticket[], meta: TicketListMeta) {
    const embed = new EmbedBuilder().setTitle('Danh sách phiếu hỗ trợ').setColor('Navy')

    if (tickets.length === 0) {
      embed.setDescription('Không có phiếu hỗ trợ nào.')
    } else {
      tickets.forEach((ticket, index) => {
        const typeLabel = TicketHelper.TICKET_TYPE_LABELS[ticket.type]
        const createdTimestamp = Math.floor(ticket.createdAt.getTime() / 1000)
        const indexNumber = (meta.page - 1) * meta.limit + index + 1

        embed.addFields({
          name: `${ticket.status === TicketStatus.CLOSED ? '🔒' : '🔓'} **${indexNumber}. #${ticket.code}**`,
          value: lines(
            `- **Loại:** ${typeLabel}`,
            `- **Người tạo:** <@${ticket.requesterId}>`,
            `- **Thời gian tạo:** <t:${createdTimestamp}:R>`,
            ticket.status === TicketStatus.OPEN && `- **Kênh hỗ trợ:** <#${ticket.channelId}>`
          ),
          inline: false
        })
      })
    }

    // Footer with filters info
    const typeText = meta.type ? TicketHelper.TICKET_TYPE_LABELS[meta.type] : 'Tất cả'
    const statusText = !meta.status
      ? 'Tất cả'
      : meta.status === TicketStatus.OPEN
        ? 'Đang mở'
        : 'Đã đóng'

    embed.setFooter({
      text: `Trang ${meta.page}/${meta.totalPages || 1} • Tổng: ${meta.total} phiếu • Loại: ${typeText} • Trạng thái: ${statusText}`
    })

    return embed
  }

  // Creates pagination controls (First, Prev, Next, Last)
  private static createPagination(meta: TicketListMeta) {
    const currentState: TicketListState = { page: meta.page, type: meta.type, status: meta.status }

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      createButton(
        'pagination-indicator',
        currentState,
        undefined,
        true,
        ButtonStyle.Secondary,
        'Trang'
      ),
      createButton(
        'first',
        { ...currentState, page: 1 },
        STATIC_EMOJI.FIRST,
        !meta.hasPrev,
        ButtonStyle.Primary
      ),
      createButton(
        'prev',
        { ...currentState, page: meta.page - 1 },
        STATIC_EMOJI.PREVIOUS,
        !meta.hasPrev,
        ButtonStyle.Primary
      ),
      createButton(
        'next',
        { ...currentState, page: meta.page + 1 },
        STATIC_EMOJI.NEXT,
        !meta.hasNext,
        ButtonStyle.Primary
      ),
      createButton(
        'last',
        { ...currentState, page: meta.totalPages },
        STATIC_EMOJI.LAST,
        !meta.hasNext,
        ButtonStyle.Primary
      )
    )
  }

  // Creates a row of buttons to filter tickets by Type
  private static createTypeFilter(meta: TicketListMeta) {
    const baseState: TicketListState = { page: 1, status: meta.status } // Reset page when filtering

    const types: Array<{
      action: string
      emoji: string | undefined
      state: TicketListState
      label?: string
      disabled?: boolean
      style?: ButtonStyle
    }> = [
      {
        action: 'type-filter-indicator',
        emoji: undefined,
        label: 'Loại',
        state: { ...baseState, type: undefined },
        disabled: true,
        style: ButtonStyle.Secondary
      },
      {
        action: 'type-all',
        emoji: '📁',
        state: { ...baseState, type: undefined }
      },
      {
        action: 'type-report',
        emoji: '🚩',
        state: { ...baseState, type: 'REPORT' }
      },
      {
        action: 'type-feedback',
        emoji: '💡',
        state: { ...baseState, type: 'FEEDBACK' }
      },
      { action: 'type-bug', emoji: '🐛', state: { ...baseState, type: 'BUG' } }
    ]

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      types.map(({ action, emoji, state, label, disabled, style }) =>
        createButton(
          action,
          state,
          emoji,
          disabled ?? meta.type === state.type,
          style ?? ButtonStyle.Primary,
          label
        )
      )
    )
  }

  // Creates a row of buttons to filter tickets by Status
  private static createStatusFilter(meta: TicketListMeta) {
    const baseState: TicketListState = { page: 1, type: meta.type } // Reset page when filtering

    const statuses: Array<{
      action: string
      emoji: string | undefined
      state: TicketListState
      label?: string
      disabled?: boolean
      style?: ButtonStyle
    }> = [
      {
        action: 'status-filter-indicator',
        emoji: undefined,
        label: 'T.Thái',
        state: { ...baseState, status: undefined },
        disabled: true,
        style: ButtonStyle.Secondary
      },
      {
        action: 'status-all',
        emoji: '📂',
        state: { ...baseState, status: undefined }
      },
      {
        action: 'status-open',
        emoji: '🔓',
        state: { ...baseState, status: TicketStatus.OPEN }
      },
      {
        action: 'status-closed',
        emoji: '🔒',
        state: { ...baseState, status: TicketStatus.CLOSED }
      }
    ]

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      statuses.map(({ action, emoji, state, label, disabled, style }) =>
        createButton(
          action,
          state,
          emoji,
          disabled ?? meta.status === state.status,
          style ?? ButtonStyle.Primary,
          label
        )
      )
    )
  }
}
