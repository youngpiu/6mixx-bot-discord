import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ContainerBuilder
} from 'discord.js'

import { ListBuilder } from '~/shared/components/ListBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { MusicQuizSongRepository } from '../repositories/MusicQuizSongRepository'

// State for Music Quiz Songs List
export interface MusicQuizSongsState {
  page: number
}

export const encodeSongsState = (state: MusicQuizSongsState): string => {
  return `p=${state.page}`
}

export const decodeSongsState = (encoded: string): MusicQuizSongsState => {
  const state: MusicQuizSongsState = { page: 1 }
  const parts = encoded.split(':')
  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 'p') state.page = parseInt(value, 10) || 1
  }
  return state
}

export interface MusicQuizSongsMeta extends MusicQuizSongsState {
  total: number
  totalPages: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export class MusicQuizSongsCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    try {
      const { items, meta } = await MusicQuizSongRepository.findMany(1, 10)

      return await InteractionUtil.replyWithComponents(
        interaction,
        this.createSongsResponse(items, meta)
      )
    } catch (error) {
      console.error('[MusicQuizSongsCommand] Error:', error)
      return await InteractionUtil.replyError(
        interaction,
        'Có lỗi xảy ra khi truy xuất danh sách bài hát.'
      )
    }
  }

  public static async handleButton(
    interaction: ButtonInteraction,
    state: MusicQuizSongsState
  ) {
    const { items, meta } = await MusicQuizSongRepository.findMany(
      state.page,
      10
    )

    await InteractionUtil.replyWithComponents(
      interaction,
      this.createSongsResponse(items, meta)
    )
  }

  private static createSongsResponse(
    items: {
      title: string
      bestGuesserId: string | null
      bestGuessTime: number | null
    }[],
    meta: MusicQuizSongsMeta
  ) {
    const listBuilder = new ListBuilder<MusicQuizSongsMeta>({
      title: 'DANH SÁCH KỶ LỤC TỪNG BÀI HÁT',
      idPrefix: CUSTOM_ID.MUSIC_QUIZ_SONGS_PREFIX,
      encodeState: encodeSongsState
    })

    if (items.length === 0) {
      return [
        new ContainerBuilder().addTextDisplayComponents((t) =>
          t.setContent('Hiện tại chưa có bài hát nào.')
        )
      ]
    }

    items.forEach((song, index) => {
      const rank = (meta.page - 1) * meta.limit + index + 1
      const bestGuesser = song.bestGuesserId
        ? `<@${song.bestGuesserId}>`
        : 'Chưa có'
      const bestTime = song.bestGuessTime
        ? `${song.bestGuessTime.toFixed(1)}s`
        : '--s'

      listBuilder.addItem(
        `${rank}. **${song.title}** - ${bestGuesser} - ${bestTime}`
      )
    })

    listBuilder.addPaginationRow(meta)

    return listBuilder.build()
  }
}
