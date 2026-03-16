import { ButtonInteraction, ChatInputCommandInteraction } from 'discord.js'

import { ListBuilder } from '~/shared/components/ListBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { MusicQuizSongRepository } from '../repositories/MusicQuizSongRepository'

// State for Music Quiz Leaderboard
export interface MusicQuizTopState {
  page: number
}

export const encodeState = (state: MusicQuizTopState): string => {
  return `p=${state.page}`
}

export const decodeState = (encoded: string): MusicQuizTopState => {
  const state: MusicQuizTopState = { page: 1 }
  const parts = encoded.split(':')
  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 'p') state.page = parseInt(value, 10) || 1
  }
  return state
}

export interface MusicQuizTopMeta extends MusicQuizTopState {
  total: number
  totalPages: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export class MusicQuizTopCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const { items, meta } = await MusicQuizSongRepository.getTopLeaderboard(
      1,
      10
    )

    return await InteractionUtil.editReply(
      interaction,
      this.createTopResponse(items, meta)
    )
  }

  public static async handleButton(
    interaction: ButtonInteraction,
    state: MusicQuizTopState
  ) {
    const { items, meta } = await MusicQuizSongRepository.getTopLeaderboard(
      state.page,
      10
    )

    await InteractionUtil.editReply(
      interaction,
      this.createTopResponse(items, meta)
    )
  }

  private static createTopResponse(
    items: { userId: string; count: number }[],
    meta: MusicQuizTopMeta
  ) {
    const listBuilder = new ListBuilder<MusicQuizTopMeta>({
      title: 'BẢNG XẾP HẠNG KỶ LỤC MUSIC QUIZ',
      footer: `Trang ${meta.page}/${meta.totalPages || 1} • Tổng: ${meta.total} người dùng`,
      idPrefix: CUSTOM_ID.MUSIC_QUIZ_TOP_PREFIX,
      encodeState: encodeState
    })

    if (items.length === 0) {
      return {
        content: 'Hiện tại chưa có ai giữ kỷ lục nào!'
      }
    }

    items.forEach((entry, index) => {
      const rank = (meta.page - 1) * meta.limit + index + 1
      listBuilder.addItem(`${rank}. <@${entry.userId}> - **${entry.count}** 🏆`)
    })

    listBuilder.addPaginationRow(meta)

    return {
      components: listBuilder.build()
    }
  }
}
