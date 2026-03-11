import {
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type InteractionEditReplyOptions
} from 'discord.js'

import { Ticket, TicketType } from 'generated/prisma/client'
import { TicketStatus } from 'generated/prisma/enums'

import { ListBuilder } from '~/shared/components/ListBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { formatFields, lines } from '~/shared/utils/textUtil'

import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'
import { TicketRepository } from '~/modules/ticket/repositories/ticketRepository'

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
export const createFilterButton = (
  action: string,
  state: TicketListState,
  emoji: string | undefined,
  disabled: boolean,
  style = ButtonStyle.Secondary,
  label?: string
) => {
  const customId = `${CUSTOM_ID.TICKET_LIST_PREFIX}${action}:${encodeState(state)}`
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setStyle(style)
    .setDisabled(disabled)

  if (emoji) button.setEmoji(emoji)
  if (label) button.setLabel(label)

  return button
}

export class TicketListCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) return

    // Fetch initial data (page 1, default limits)
    const { items, meta } = await TicketRepository.findMany({
      guildId: interaction.guild.id,
      page: 1,
      limit: 10
    })

    return await interaction.editReply(this.createListResponse(items, meta))
  }

  public static async handleButton(
    interaction: ButtonInteraction,
    state: TicketListState
  ) {
    if (!interaction.guild) return

    // Fetch data based on the state encoded in the button
    const { items, meta } = await TicketRepository.findMany({
      guildId: interaction.guild.id,
      page: state.page,
      limit: 10,
      type: state.type,
      status: state.status
    })

    await interaction.editReply(this.createListResponse(items, meta))
  }

  public static createListResponse(
    tickets: Ticket[],
    meta: TicketListMeta
  ): InteractionEditReplyOptions {
    const typeText = meta.type
      ? TicketHelper.TICKET_TYPE_LABELS[meta.type]
      : 'Tất cả'
    const statusText = !meta.status
      ? 'Tất cả'
      : meta.status === TicketStatus.OPEN
        ? 'Đang mở'
        : 'Đã đóng'

    const listBuilder = new ListBuilder<TicketListMeta>({
      title: 'DANH SÁCH PHIẾU HỖ TRỢ',
      footer: `Trang ${meta.page}/${meta.totalPages || 1} • Tổng: ${meta.total} phiếu • Loại: ${typeText} • Trạng thái: ${statusText}`,
      idPrefix: CUSTOM_ID.TICKET_LIST_PREFIX,
      encodeState: encodeState
    })

    tickets.forEach((ticket, index) => {
      const typeLabel = TicketHelper.TICKET_TYPE_LABELS[ticket.type]
      const statusLabel = TicketHelper.getStatusText(ticket.status)
      const indexNumber = (meta.page - 1) * meta.limit + index + 1

      const fields: [string, string][] = [
        ['Trạng thái', `**${statusLabel}**`],
        ['Loại', `**${typeLabel}**`],
        ['Người tạo', `<@${ticket.requesterId}>`],
        [
          'Thời gian tạo',
          `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`
        ]
      ]

      if (ticket.status === TicketStatus.OPEN) {
        fields.push(['Kênh hỗ trợ', `<#${ticket.channelId}>`])
      }

      const itemContent = lines(
        `### ${indexNumber}. #${ticket.code}`,
        ...formatFields(fields)
      )

      listBuilder.addItem(itemContent)
    })

    listBuilder.addPaginationRow(meta)

    listBuilder.addActionRow(this.createTypeFilterRow(meta))
    listBuilder.addActionRow(this.createStatusFilterRow(meta))

    return {
      components: listBuilder.build(),
      flags: ['IsComponentsV2']
    }
  }

  private static createTypeFilterRow(meta: TicketListMeta): ButtonBuilder[] {
    const baseState: TicketListState = { page: 1, status: meta.status } // Reset page when filtering

    return [
      createFilterButton(
        'type-filter-indicator',
        { ...baseState, type: undefined },
        undefined,
        true,
        ButtonStyle.Secondary,
        'Loại'
      ),
      createFilterButton(
        'type-all',
        { ...baseState, type: undefined },
        undefined,
        meta.type === undefined,
        ButtonStyle.Secondary,
        'Tất cả'
      ),
      createFilterButton(
        'type-report',
        { ...baseState, type: 'REPORT' },
        undefined,
        meta.type === 'REPORT',
        ButtonStyle.Secondary,
        'Báo cáo'
      ),
      createFilterButton(
        'type-feedback',
        { ...baseState, type: 'FEEDBACK' },
        undefined,
        meta.type === 'FEEDBACK',
        ButtonStyle.Secondary,
        'Góp ý'
      ),
      createFilterButton(
        'type-bug',
        { ...baseState, type: 'BUG' },
        undefined,
        meta.type === 'BUG',
        ButtonStyle.Secondary,
        'Báo lỗi'
      )
    ]
  }

  private static createStatusFilterRow(meta: TicketListMeta): ButtonBuilder[] {
    const baseState: TicketListState = { page: 1, type: meta.type } // Reset page when filtering

    return [
      createFilterButton(
        'status-filter-indicator',
        { ...baseState, status: undefined },
        undefined,
        true,
        ButtonStyle.Secondary,
        'T.Thái'
      ),
      createFilterButton(
        'status-all',
        { ...baseState, status: undefined },
        undefined,
        meta.status === undefined,
        ButtonStyle.Secondary,
        'Tất cả'
      ),
      createFilterButton(
        'status-open',
        { ...baseState, status: TicketStatus.OPEN },
        undefined,
        meta.status === TicketStatus.OPEN,
        ButtonStyle.Secondary,
        'Đang mở'
      ),
      createFilterButton(
        'status-closed',
        { ...baseState, status: TicketStatus.CLOSED },
        undefined,
        meta.status === TicketStatus.CLOSED,
        ButtonStyle.Secondary,
        'Đã đóng'
      )
    ]
  }
}
