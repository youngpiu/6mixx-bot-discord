// Command to list confessions
import {
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type InteractionEditReplyOptions
} from 'discord.js'

import { Confession } from 'generated/prisma/client'
import { ConfessionStatus } from 'generated/prisma/enums'

import { ListBuilder } from '~/shared/components/ListBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { formatFields, lines } from '~/shared/utils/textUtil'

import { ConfessionHelper } from '~/modules/confession/helpers/ConfessionHelper'
import { ConfessionRepository } from '~/modules/confession/repositories/confessionRepository'

export interface ConfessionListState {
  page: number
  status?: ConfessionStatus
}

export interface ConfessionListMeta extends ConfessionListState {
  total: number
  totalPages: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export const encodeState = (state: ConfessionListState): string => {
  const parts = [`p=${state.page}`]
  if (state.status) parts.push(`s=${state.status}`)
  return parts.join(':')
}

export const decodeState = (encoded: string): ConfessionListState => {
  const state: ConfessionListState = { page: 1 }
  const parts = encoded.split(':')

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 'p') state.page = parseInt(value, 10) || 1
    if (key === 's') state.status = value as ConfessionStatus
  }

  return state
}

export const createFilterButton = (
  action: string,
  state: ConfessionListState,
  emoji: string | undefined,
  disabled: boolean,
  style = ButtonStyle.Secondary,
  label?: string
) => {
  const customId = `${CUSTOM_ID.CONFESSION_LIST_PREFIX}${action}:${encodeState(state)}`
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setStyle(style)
    .setDisabled(disabled)

  if (emoji) button.setEmoji(emoji)
  if (label) button.setLabel(label)

  return button
}

export class ConfessionListCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) return

    const { confessions, total } = await ConfessionRepository.findMany({
      guildId: interaction.guild.id,
      page: 1,
      limit: 5
    })

    const totalPages = Math.ceil(total / 5)

    const meta: ConfessionListMeta = {
      page: 1,
      limit: 5,
      total,
      totalPages,
      hasNext: 1 < totalPages,
      hasPrev: false
    }

    return await interaction.editReply(
      this.createListResponse(confessions, meta)
    )
  }

  public static async handleButton(
    interaction: ButtonInteraction,
    state: ConfessionListState
  ) {
    if (!interaction.guild) return

    const { confessions, total } = await ConfessionRepository.findMany({
      guildId: interaction.guild.id,
      page: state.page,
      limit: 5,
      status: state.status
    })

    const totalPages = Math.ceil(total / 5)

    const meta: ConfessionListMeta = {
      page: state.page,
      limit: 5,
      total,
      totalPages,
      hasNext: state.page < totalPages,
      hasPrev: state.page > 1,
      status: state.status
    }

    await interaction.editReply(this.createListResponse(confessions, meta))
  }

  public static createListResponse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    confessions: (Confession & { author?: any })[],
    meta: ConfessionListMeta
  ): InteractionEditReplyOptions {
    const statusText = !meta.status
      ? 'Tất cả'
      : ConfessionHelper.getStatusLabel(meta.status)

    const listBuilder = new ListBuilder<ConfessionListMeta>({
      title: 'DANH SÁCH CONFESSION',
      footer: `Trang ${meta.page}/${meta.totalPages || 1} • Tổng: ${meta.total} confession • Trạng thái: ${statusText}`,
      idPrefix: CUSTOM_ID.CONFESSION_LIST_PREFIX,
      encodeState: encodeState
    })

    confessions.forEach((cfs, index) => {
      const indexNumber = (meta.page - 1) * meta.limit + index + 1
      const itemStatusText = ConfessionHelper.getStatusLabel(cfs.status)

      const fields = formatFields([
        ['Trạng thái', `**${itemStatusText}**`],
        [
          'Người gửi',
          cfs.isAnonymous
            ? 'Ẩn danh'
            : cfs.author
              ? `<@${cfs.author.userId}>`
              : 'Không rõ'
        ],
        [
          'Nội dung',
          cfs.content.length > 100
            ? cfs.content.substring(0, 100) + '...'
            : cfs.content
        ]
      ])

      if (cfs.forumPostId)
        fields.push(...formatFields([['Bài viết', `<#${cfs.forumPostId}>`]]))

      fields.push(
        ...formatFields([
          [
            'Thời gian gửi',
            `<t:${Math.floor(cfs.createdAt.getTime() / 1000)}:R>`
          ]
        ])
      )

      const itemContent = lines(`### ${indexNumber}. #${cfs.code}`, ...fields)

      listBuilder.addItem(itemContent)
    })

    listBuilder.addPaginationRow(meta)

    listBuilder.addActionRow(this.createFilterRow(meta))

    return {
      components: listBuilder.build(),
      flags: ['IsComponentsV2']
    }
  }

  private static createFilterRow(meta: ConfessionListMeta): ButtonBuilder[] {
    const baseState: ConfessionListState = { page: 1 } // Reset page when filtering

    return [
      new ButtonBuilder()
        .setCustomId('label-status')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
        .setLabel('T.Thái'),
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
        { ...baseState, status: ConfessionStatus.PENDING },
        undefined,
        meta.status === ConfessionStatus.PENDING,
        ButtonStyle.Secondary,
        'Chờ duyệt'
      ),
      createFilterButton(
        'status-approved',
        { ...baseState, status: ConfessionStatus.APPROVED },
        undefined,
        meta.status === ConfessionStatus.APPROVED,
        ButtonStyle.Secondary,
        'Đã duyệt'
      ),
      createFilterButton(
        'status-rejected',
        { ...baseState, status: ConfessionStatus.REJECTED },
        undefined,
        meta.status === ConfessionStatus.REJECTED,
        ButtonStyle.Secondary,
        'Từ chối'
      )
    ]
  }
}
