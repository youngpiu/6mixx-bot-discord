import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { Ticket, TicketType } from 'generated/prisma/client'
import { TicketStatus } from 'generated/prisma/enums'

import { DEFAULT_PAGINATION_LIMIT } from '~/constants/commonConstant'
import { EMOIJ } from '~/constants/emoijConstant'
import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'

import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'
import { TICKET_TYPE_LABELS } from '~/utils/ticketUtil'

import { TicketRepository } from '~/repositories/ticketRepository'

// Types
export interface TicketListState {
  page: number
  type?: TicketType
  status?: TicketStatus
}

export interface TicketListMeta extends TicketListState {
  total: number
  totalPages: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

// State encoding/decoding helpers
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
  label: string,
  disabled: boolean,
  style = ButtonStyle.Secondary
) => {
  const customId = `ticket-list:${action}:${encodeState(state)}`
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setDisabled(disabled)
}

export class TicketListCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const { items, meta } = await TicketRepository.getTickets({
      guildId: interaction.guildId,
      page: 1,
      limit: DEFAULT_PAGINATION_LIMIT
    })

    const response = await interaction.editReply(this.createListResponse(items, meta))
    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.MEDIUM)
    return response
  }

  public static async handleButton(interaction: ButtonInteraction, state: TicketListState) {
    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const { items, meta } = await TicketRepository.getTickets({
      guildId: interaction.guildId,
      page: state.page,
      limit: 5,
      type: state.type,
      status: state.status
    })

    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.MEDIUM)
    return interaction.update(this.createListResponse(items, meta))
  }

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

  private static createEmbed(tickets: Ticket[], meta: TicketListMeta) {
    const embed = new EmbedBuilder().setTitle('Danh sách phiếu hỗ trợ').setColor(0x5865f2)

    if (tickets.length === 0) {
      embed.setDescription('Không có phiếu hỗ trợ nào.')
    } else {
      tickets.forEach((ticket, index) => {
        const typeLabel = TICKET_TYPE_LABELS[ticket.type]
        const createdTimestamp = Math.floor(ticket.createdAt.getTime() / 1000)
        const indexNumber = (meta.page - 1) * meta.limit + index + 1

        embed.addFields({
          name: `${indexNumber}. #${ticket.code} ${ticket.status === TicketStatus.CLOSED ? EMOIJ.CLOSE : EMOIJ.OPEN} `,
          value: lines(
            `**Loại:** ${typeLabel}`,
            `**Người tạo:** <@${ticket.requesterId}>`,
            `**Kênh:** <#${ticket.threadId}>`,
            `**Thời gian tạo:** <t:${createdTimestamp}:R>`
          ),
          inline: false
        })
      })
    }

    // Footer with filters info
    const typeText = meta.type ? TICKET_TYPE_LABELS[meta.type] : 'Tất cả'
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

  private static createPagination(meta: TicketListMeta) {
    const currentState: TicketListState = { page: meta.page, type: meta.type, status: meta.status }

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      createButton(
        'first',
        { ...currentState, page: 1 },
        '⏮️ Đầu',
        !meta.hasPrev,
        ButtonStyle.Primary
      ),
      createButton(
        'prev',
        { ...currentState, page: meta.page - 1 },
        '◀️ Trước',
        !meta.hasPrev,
        ButtonStyle.Primary
      ),
      createButton(
        'next',
        { ...currentState, page: meta.page + 1 },
        'Sau ▶️',
        !meta.hasNext,
        ButtonStyle.Primary
      ),
      createButton(
        'last',
        { ...currentState, page: meta.totalPages },
        'Cuối ⏭️',
        !meta.hasNext,
        ButtonStyle.Primary
      )
    )
  }

  private static createTypeFilter(meta: TicketListMeta) {
    const baseState: TicketListState = { page: 1, status: meta.status } // Reset page when filtering

    const types: Array<{ action: string; label: string; state: TicketListState }> = [
      { action: 'type-all', label: '🗂️ Tất cả', state: { ...baseState, type: undefined } },
      { action: 'type-report', label: '🚨 Báo cáo', state: { ...baseState, type: 'REPORT' } },
      { action: 'type-feedback', label: '📝 Góp ý', state: { ...baseState, type: 'FEEDBACK' } },
      { action: 'type-bug', label: '🐞 Báo lỗi', state: { ...baseState, type: 'BUG' } }
    ]

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      types.map(({ action, label, state }) =>
        createButton(action, state, label, meta.type === state.type, ButtonStyle.Success)
      )
    )
  }

  private static createStatusFilter(meta: TicketListMeta) {
    const baseState: TicketListState = { page: 1, type: meta.type } // Reset page when filtering

    const statuses: Array<{ action: string; label: string; state: TicketListState }> = [
      { action: 'status-all', label: '🗂️ Tất cả', state: { ...baseState, status: undefined } },
      {
        action: 'status-open',
        label: '🟢 Đang mở',
        state: { ...baseState, status: TicketStatus.OPEN }
      },
      {
        action: 'status-closed',
        label: '🔴 Đã đóng',
        state: { ...baseState, status: TicketStatus.CLOSED }
      }
    ]

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      statuses.map(({ action, label, state }) =>
        createButton(action, state, label, meta.status === state.status, ButtonStyle.Success)
      )
    )
  }
}
