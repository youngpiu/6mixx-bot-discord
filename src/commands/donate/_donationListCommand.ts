import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { Donation, Member } from 'generated/prisma/client'
import { DonationStatus } from 'generated/prisma/enums'

import { DEFAULT_PAGINATION_LIMIT } from '~/constants/commonConstant'
import { EMOIJ } from '~/constants/emoijConstant'
import { GuildOnlyError } from '~/core/errorResponse'

import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

import { DonateRepository } from '~/repositories/donateRepository'

// Type for Donation with included donor relation
type DonationWithDonor = Donation & { donor: Member }

// Types
export interface DonationListState {
  page: number
  status?: 'PENDING' | 'TRANSFERRED'
}

export interface DonationListMeta extends DonationListState {
  total: number
  totalPages: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

// State encoding/decoding helpers
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
    if (key === 's') state.status = value as 'PENDING' | 'TRANSFERRED'
  }

  return state
}

// Helper to create a button with encoded state
const createButton = (
  action: string,
  state: DonationListState,
  label: string,
  disabled: boolean,
  style = ButtonStyle.Secondary
) => {
  const customId = `donation-list:${action}:${encodeState(state)}`
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setDisabled(disabled)
}

export class DonationListCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new GuildOnlyError()
    }

    const { items, meta } = await DonateRepository.getDonations({
      guildId: interaction.guildId,
      page: 1,
      limit: DEFAULT_PAGINATION_LIMIT
    })

    const response = await interaction.editReply(this.createListResponse(items, meta))
    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.MEDIUM)
    return response
  }

  public static async handleButton(interaction: ButtonInteraction, state: DonationListState) {
    if (!interaction.guildId) {
      throw new GuildOnlyError()
    }

    const { items, meta } = await DonateRepository.getDonations({
      guildId: interaction.guildId,
      page: state.page,
      limit: 5,
      status: state.status
    })

    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.MEDIUM)
    return interaction.editReply(this.createListResponse(items, meta))
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
        const statusIcon = donation.status === DonationStatus.TRANSFERRED ? EMOIJ.OK : EMOIJ.WAIT

        embed.addFields({
          name: `${indexNumber}. #${donation.code} ${statusIcon}`,
          value: lines(
            `- **Mã người chuyển:** \`${(donation as DonationWithDonor).donor?.donorCode || 'N/A'}\``,
            `- **Số tiền:** ${donation.amount.toLocaleString('vi-VN')}đ`,
            `- **Thời gian tạo:** <t:${createdTimestamp}:R>`
          ),
          inline: false
        })
      })
    }

    // Footer with filters info
    const statusText = !meta.status
      ? 'Tất cả'
      : meta.status === DonationStatus.PENDING
        ? 'Chờ xác nhận'
        : 'Đã xác nhận'

    embed.setFooter({
      text: `Trang ${meta.page}/${meta.totalPages || 1} • Tổng: ${meta.total} khoản • Trạng thái: ${statusText}`
    })

    return embed
  }

  private static createPagination(meta: DonationListMeta) {
    const currentState: DonationListState = { page: meta.page, status: meta.status }

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

  private static createStatusFilter(meta: DonationListMeta) {
    const baseState: DonationListState = { page: 1 } // Reset page when filtering

    const statuses: Array<{ action: string; label: string; state: DonationListState }> = [
      { action: 'status-all', label: '🗂️ Tất cả', state: { ...baseState, status: undefined } },
      {
        action: 'status-pending',
        label: '⏳ Đang chờ',
        state: { ...baseState, status: DonationStatus.PENDING }
      },
      {
        action: 'status-transferred',
        label: '✅ Đã nhận',
        state: { ...baseState, status: DonationStatus.TRANSFERRED }
      }
    ]

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      statuses.map(({ action, label, state }) =>
        createButton(action, state, label, meta.status === state.status, ButtonStyle.Success)
      )
    )
  }
}
