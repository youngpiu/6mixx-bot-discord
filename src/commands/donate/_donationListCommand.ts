import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js'

import { Donation } from 'generated/prisma/client'
import { DonationStatus } from 'generated/prisma/enums'

import { STATIC_EMOJI } from '~/constants/emojiConstant'
import { CUSTOM_ID } from '~/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

import { lines } from '~/utils/textUtil'

import { DonateRepository } from '~/repositories/donateRepository'

/**
 * Interface for list state management
 */
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

/**
 * Helper to encode state into customId string
 */
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

/**
 * Creates a navigation button with encoded state
 */
const createButton = (
  action: string,
  state: DonationListState,
  emoji: string | undefined,
  disabled: boolean,
  style = ButtonStyle.Secondary,
  label?: string
) => {
  const customId = `${CUSTOM_ID.DONATION_LIST_PREFIX}${action}:${encodeState(state)}`
  const button = new ButtonBuilder().setCustomId(customId).setStyle(style).setDisabled(disabled)

  if (emoji) {
    button.setEmoji(emoji)
  }

  if (label) {
    button.setLabel(label)
  }

  return button
}

export class DonationListCommand {
  /**
   * Main entry point for the donation list command.
   * Displays a paginated list of donations.
   *
   * @param interaction - The chat input command interaction
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const { items, meta } = await DonateRepository.getDonations({
      guildId: interaction.guildId,
      page: 1,
      limit: 10
    })

    return await interaction.editReply(this.createListResponse(items, meta))
  }

  /**
   * Handles button interactions for pagination and filtering.
   *
   * @param interaction - The button interaction
   * @param state - The decoded list state
   */
  public static async handleButton(interaction: ButtonInteraction, state: DonationListState) {
    if (!interaction.guildId) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const { items, meta } = await DonateRepository.getDonations({
      guildId: interaction.guildId,
      page: state.page,
      limit: 10,
      status: state.status
    })

    await interaction.editReply(this.createListResponse(items, meta))
  }

  public static createListResponse(donations: Donation[], meta: DonationListMeta) {
    return {
      embeds: [this.createEmbed(donations, meta)],
      components: [this.createPagination(meta), this.createStatusFilter(meta)]
    }
  }

  private static createEmbed(donations: Donation[], meta: DonationListMeta) {
    const embed = new EmbedBuilder().setTitle('Danh sách quyên góp').setColor(0x5865f2)

    if (donations.length === 0) {
      embed.setDescription('Không có khoản quyên góp nào.')
    } else {
      donations.forEach((donation, index) => {
        const createdTimestamp = Math.floor(donation.createdAt.getTime() / 1000)
        const indexNumber = (meta.page - 1) * meta.limit + index + 1

        // Determine status icon based on donation status
        let statusIcon = '⏳'
        if (donation.status === DonationStatus.TRANSFERRED) {
          statusIcon = '✅'
        } else if (donation.status === DonationStatus.PENDING_VERIFICATION) {
          statusIcon = '⏳'
        } else if (donation.status === DonationStatus.CANCELED) {
          statusIcon = '❌'
        }

        embed.addFields({
          name: `${statusIcon} ${indexNumber}. #${donation.code}`,
          value: lines(
            `- **Số tiền:** ${donation.amount.toLocaleString('vi-VN')}đ`,
            `- **Thời gian tạo:** <t:${createdTimestamp}:R>`
          ),
          inline: false
        })
      })
    }

    // Generate status filter text for footer
    const statusText = !meta.status
      ? 'Tất cả'
      : meta.status === DonationStatus.PENDING
        ? 'Đang chờ'
        : meta.status === DonationStatus.PENDING_VERIFICATION
          ? 'Chờ xác nhận'
          : meta.status === DonationStatus.TRANSFERRED
            ? 'Đã chuyển'
            : 'Đã hủy'

    embed.setFooter({
      text: `Trang ${meta.page}/${meta.totalPages || 1} • Tổng: ${meta.total} khoản • Trạng thái: ${statusText}`
    })

    return embed
  }

  private static createPagination(meta: DonationListMeta) {
    const currentState: DonationListState = { page: meta.page, status: meta.status }

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

  private static createStatusFilter(meta: DonationListMeta) {
    const baseState: DonationListState = { page: 1 } // Reset page when filtering

    const statuses: Array<{
      action: string
      emoji: string | undefined
      state: DonationListState
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
        emoji: '📋',
        state: { ...baseState, status: undefined }
      },
      {
        action: 'status-pending-verification',
        emoji: '⏳',
        state: { ...baseState, status: DonationStatus.PENDING_VERIFICATION }
      },
      {
        action: 'status-transferred',
        emoji: '✅',
        state: { ...baseState, status: DonationStatus.TRANSFERRED }
      },
      {
        action: 'status-canceled',
        emoji: '❌',
        state: { ...baseState, status: DonationStatus.CANCELED }
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
