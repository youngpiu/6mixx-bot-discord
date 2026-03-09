import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type InteractionEditReplyOptions,
  MessageFlags
} from 'discord.js'
import { ListBuilder } from '~/components/ListBuilder'

import { Disbursement } from 'generated/prisma/client'

import { CUSTOM_ID } from '~/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

import { lines } from '~/utils/textUtil'

import { DisbursementRepository } from '~/repositories/disbursementRepository'

export interface DisbursementListState {
  page: number
}

export interface DisbursementListMeta extends DisbursementListState {
  total: number
  totalPages: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export const encodeState = (state: DisbursementListState): string => {
  return `p=${state.page}`
}

export const decodeState = (encoded: string): DisbursementListState => {
  const state: DisbursementListState = { page: 1 }
  const parts = encoded.split(':')

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 'p') state.page = parseInt(value, 10) || 1
  }

  return state
}

const createButton = (
  action: string,
  state: DisbursementListState,
  emoji: string | undefined,
  disabled: boolean,
  style = ButtonStyle.Secondary,
  label?: string
) => {
  const customId = `${CUSTOM_ID.DISBURSEMENT_LIST_PREFIX}${action}:${encodeState(state)}`
  const button = new ButtonBuilder().setCustomId(customId).setStyle(style).setDisabled(disabled)

  if (emoji) button.setEmoji(emoji)
  if (label) button.setLabel(label)

  return button
}

export class DisbursementListCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction || !interaction.guild) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const { items, meta } = await DisbursementRepository.getDisbursements({
      guildId: interaction.guild.id,
      page: 1,
      limit: 5
    })

    if (items.length === 0) {
      throw new NormalError('Chưa có khoản chi nào được ghi nhận.')
    }

    const response = this.createListResponse(items, meta)
    await interaction.editReply(response)
  }

  public static async handleButton(interaction: ButtonInteraction, state: DisbursementListState) {
    if (!interaction || !interaction.guild) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const { items, meta } = await DisbursementRepository.getDisbursements({
      guildId: interaction.guild.id,
      page: state.page,
      limit: 5
    })

    const response = this.createListResponse(items, meta)
    await interaction.editReply(response)
  }

  public static createListResponse(
    disbursements: Disbursement[],
    meta: DisbursementListMeta
  ): InteractionEditReplyOptions {
    const listBuilder = new ListBuilder({
      title: 'DANH SÁCH CÁC KHOẢN CHI'
    })

    disbursements.forEach((d, index) => {
      const indexNumber = (meta.page - 1) * meta.limit + index + 1
      const itemContent = lines(
        `### ${indexNumber}. ${d.amount.toLocaleString('vi-VN')}đ`,
        `- \`Mô tả    :\` **${d.description}**`,
        `- \`Thời gian:\` <t:${Math.floor(d.createdAt.getTime() / 1000)}:F>`
      )
      listBuilder.addItem(itemContent)
    })

    listBuilder.addPaginationRow(meta, createButton)

    return {
      components: listBuilder.build(),
      flags: [MessageFlags.IsComponentsV2]
    }
  }
}
