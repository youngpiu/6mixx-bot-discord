import {
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type InteractionEditReplyOptions
} from 'discord.js'

import { Donation } from 'generated/prisma/client'
import { DonationStatus } from 'generated/prisma/enums'

import { ListBuilder } from '~/shared/components/ListBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { formatFields, lines } from '~/shared/utils/textUtil'

import { DonationHelper } from '~/modules/donation/helpers/DonationHelper'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'

export interface DonationListState {
  page: number
  status?: DonationStatus
}

export interface DonationListMeta extends DonationListState {
  total: number
  totalPages: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export const encodeState = (state: DonationListState): string => {
  const parts = [`p=${state.page}`]
  if (state.status) parts.push(`s=${state.status}`)
  return parts.join(':')
}

export const decodeState = (encoded: string): DonationListState => {
  const state: DonationListState = { page: 1 }
  const parts = encoded.split(':')

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 'p') state.page = parseInt(value, 10) || 1
    if (key === 's') state.status = value as DonationStatus
  }

  return state
}

export const createFilterButton = (
  action: string,
  state: DonationListState,
  emoji: string | undefined,
  disabled: boolean,
  style = ButtonStyle.Secondary,
  label?: string
) => {
  const customId = `${CUSTOM_ID.DONATION_LIST_PREFIX}${action}:${encodeState(state)}`
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setStyle(style)
    .setDisabled(disabled)

  if (emoji) button.setEmoji(emoji)
  if (label) button.setLabel(label)

  return button
}

export class DonationListCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) return

    const { items, meta } = await DonateRepository.findMany({
      guildId: interaction.guild.id,
      page: 1,
      limit: 5
    })

    return await interaction.editReply(this.createListResponse(items, meta))
  }

  public static async handleButton(
    interaction: ButtonInteraction,
    state: DonationListState
  ) {
    if (!interaction.guild) return

    const { items, meta } = await DonateRepository.findMany({
      guildId: interaction.guild.id,
      page: state.page,
      limit: 5,
      status: state.status
    })

    await interaction.editReply(this.createListResponse(items, meta))
  }

  public static createListResponse(
    donations: Donation[],
    meta: DonationListMeta
  ): InteractionEditReplyOptions {
    const statusText = !meta.status
      ? 'Tất cả'
      : DonationHelper.getStatusText(meta.status)

    const listBuilder = new ListBuilder<DonationListMeta>({
      title: 'DANH SÁCH QUYÊN GÓP',
      emptyMessage: '_Không có khoản quyên góp nào._',
      footer: `Trang ${meta.page}/${meta.totalPages || 1} • Tổng: ${meta.total} khoản • Trạng thái: ${statusText}`,
      idPrefix: CUSTOM_ID.DONATION_LIST_PREFIX,
      encodeState: encodeState
    })

    donations.forEach((donation, index) => {
      const indexNumber = (meta.page - 1) * meta.limit + index + 1
      const itemStatusText = DonationHelper.getStatusText(donation.status)

      const formattedAmount = donation.amount.toLocaleString('vi-VN') + 'đ'

      const itemContent = lines(
        `### ${indexNumber}. #${donation.code}`,
        ...formatFields([
          ['Trạng thái', `**${itemStatusText}**`],
          ['Số tiền', `**${formattedAmount}**`],
          [
            'Lời nhắn',
            donation.message
              ? `**${donation.message.length > 100 ? donation.message.slice(0, 100) + '...' : donation.message}**`
              : null
          ],
          [
            'Thời gian tạo',
            `<t:${Math.floor(donation.createdAt.getTime() / 1000)}:R>`
          ]
        ])
      )

      listBuilder.addItem(itemContent)
    })

    listBuilder.addPaginationRow(meta)

    listBuilder.addActionRow([
      new ButtonBuilder()
        .setCustomId('label-status')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
        .setLabel('Trạng thái ⬇️')
    ])

    listBuilder.addActionRow(this.createFilterRow(meta))

    return {
      components: listBuilder.build(),
      flags: ['IsComponentsV2']
    }
  }

  private static createFilterRow(meta: DonationListMeta): ButtonBuilder[] {
    const baseState: DonationListState = { page: 1 } // Reset page when filtering

    return [
      createFilterButton(
        'status-all',
        { ...baseState, status: undefined },
        undefined,
        meta.status === undefined,
        ButtonStyle.Secondary,
        'Tất cả'
      ),
      createFilterButton(
        'status-pending',
        { ...baseState, status: DonationStatus.PENDING },
        undefined,
        meta.status === DonationStatus.PENDING,
        ButtonStyle.Secondary,
        'Chờ'
      ),
      createFilterButton(
        'status-pending-verification',
        { ...baseState, status: DonationStatus.PENDING_VERIFICATION },
        undefined,
        meta.status === DonationStatus.PENDING_VERIFICATION,
        ButtonStyle.Secondary,
        'Chờ xác nhận'
      ),
      createFilterButton(
        'status-transferred',
        { ...baseState, status: DonationStatus.TRANSFERRED },
        undefined,
        meta.status === DonationStatus.TRANSFERRED,
        ButtonStyle.Secondary,
        'Đã chuyển'
      ),
      createFilterButton(
        'status-canceled',
        { ...baseState, status: DonationStatus.CANCELED },
        undefined,
        meta.status === DonationStatus.CANCELED,
        ButtonStyle.Secondary,
        'Đã hủy'
      )
    ]
  }
}
