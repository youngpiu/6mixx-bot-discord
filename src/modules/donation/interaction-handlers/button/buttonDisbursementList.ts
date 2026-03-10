import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  type InteractionEditReplyOptions,
  MessageFlags
} from 'discord.js'

import { Disbursement } from 'generated/prisma/client'

import { NormalError } from '~/core/errorResponse'

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

const createButton = (
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

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonDisbursementList extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId === CUSTOM_ID.BTN_DISBURSEMENT_LIST) {
      return this.some({ page: 1 })
    }

    if (interaction.customId.startsWith(CUSTOM_ID.DISBURSEMENT_LIST_PREFIX)) {
      const parts = interaction.customId
        .slice(CUSTOM_ID.DISBURSEMENT_LIST_PREFIX.length)
        .split(':')
      const state = decodeState(parts[1] || '')
      return this.some(state)
    }

    return this.none()
  }

  public async run(
    interaction: ButtonInteraction,
    state: DisbursementListState
  ) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const { items, meta } = await DisbursementRepository.findMany({
      guildId: interaction.guild.id,
      page: state.page,
      limit: 5
    })

    if (items.length === 0) {
      throw new NormalError('Chưa có khoản chi nào được ghi nhận.')
    }

    const response = this.createListResponse(items, meta)
    await interaction.editReply(response)
  }

  private createListResponse(
    disbursements: Disbursement[],
    meta: DisbursementListMeta
  ): InteractionEditReplyOptions {
    const listBuilder = new ListBuilder({
      title: 'DANH SÁCH CÁC KHOẢN CHI',
      footer: `Trang ${meta.page}/${meta.totalPages || 1} • Tổng: ${meta.total} khoản`
    })

    disbursements.forEach((d, index) => {
      const indexNumber = (meta.page - 1) * meta.limit + index + 1
      const itemContent = lines(
        `### ${indexNumber}. ${d.amount.toLocaleString('vi-VN')}đ`,
        ...formatFields([
          ['Mô tả', `**${d.description}**`],
          ['Thời gian', `<t:${Math.floor(d.createdAt.getTime() / 1000)}:R>`],
          ['Đường dẫn tin nhắn', `[Xem tại đây](${d.messageUrl})`]
        ])
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
