import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type InteractionEditReplyOptions,
  MessageFlags
} from 'discord.js'

import { Disbursement } from 'generated/prisma/client'

import { ListBuilder } from '~/shared/components/ListBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { formatFields, lines } from '~/shared/utils/textUtil'

import { DisbursementRepository } from '~/modules/donation/repositories/disbursementRepository'

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

export const createFilterButton = (
  action: string,
  state: DisbursementListState,
  emoji: string | undefined,
  disabled: boolean,
  style = ButtonStyle.Secondary,
  label?: string
) => {
  const customId = `${CUSTOM_ID.DISBURSEMENT_LIST_PREFIX}${action}:${encodeState(state)}`
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setStyle(style)
    .setDisabled(disabled)

  if (emoji) button.setEmoji(emoji)
  if (label) button.setLabel(label)

  return button
}

export class DisbursementListCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) return

    const { items, meta } = await DisbursementRepository.findMany({
      guildId: interaction.guild.id,
      page: 1,
      limit: 5
    })

    const response = this.createListResponse(items, meta)
    await interaction.editReply(response)
  }

  public static async handleButton(
    interaction: ButtonInteraction,
    state: DisbursementListState
  ) {
    if (!interaction.guild) return

    const { items, meta } = await DisbursementRepository.findMany({
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
    const listBuilder = new ListBuilder<DisbursementListMeta>({
      title: 'DANH SÁCH CÁC KHOẢN CHI',
      idPrefix: CUSTOM_ID.DISBURSEMENT_LIST_PREFIX,
      encodeState: encodeState
    })

    disbursements.forEach((d, index) => {
      const indexNumber = (meta.page - 1) * meta.limit + index + 1
      const itemContent = lines(
        `### ${indexNumber}. [${d.code}]`,
        ...formatFields([
          ['Số tiền', `**${d.amount.toLocaleString('vi-VN')}đ**`],
          ['Mô tả', `**${d.description}**`],
          ['Thời gian', `<t:${Math.floor(d.createdAt.getTime() / 1000)}:R>`],
          ['Đường dẫn tin nhắn', `**[Xem tại đây](${d.messageUrl})**`]
        ])
      )
      listBuilder.addItem(itemContent)
    })

    listBuilder.addPaginationRow(meta)

    return {
      components: listBuilder.build(),
      flags: [MessageFlags.IsComponentsV2]
    }
  }
}
