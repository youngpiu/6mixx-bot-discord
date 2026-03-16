import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
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

@RegisterChatInputCommand((builder) =>
  builder
    .setName('quizz')
    .setDescription('Quản lý hệ thống Music Quiz.')
    .addSubcommandGroup((group) =>
      group
        .setName('add')
        .setDescription('Thêm dữ liệu cho Music Quiz.')
        .addSubcommand((sub) =>
          sub
            .setName('song')
            .setDescription('Thêm một bài hát mới vào Quiz.')
            .addStringOption((option) =>
              option
                .setName('album')
                .setDescription('Tên album của bài hát.')
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName('singer')
                .setDescription('Nghệ sĩ thể hiện.')
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName('title')
                .setDescription('Tên chính thức của bài hát.')
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName('aliases')
                .setDescription('Các tên gọi khác (phân cách bằng dấu phẩy).')
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName('duration')
                .setDescription('Độ dài bài hát (giây).')
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName('path')
                .setDescription('Đường dẫn thư mục (vd: /album/ten-bai).')
                .setRequired(true)
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('top')
        .setDescription('Xem bảng xếp hạng những người có nhiều kỷ lục nhất.')
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'quizz',
  description: 'Quản lý Music Quiz.',
  subcommands: [
    {
      type: 'group',
      name: 'add',
      entries: [
        {
          name: 'song',
          chatInputRun: 'chatInputAddSong'
        }
      ]
    },
    {
      name: 'top',
      chatInputRun: 'chatInputTop'
    }
  ]
})
export class QuizzSubcommand extends Subcommand {
  public async chatInputTop(interaction: ChatInputCommandInteraction) {
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

  public async handleButton(
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

  private createTopResponse(
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

  public async chatInputAddSong(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const album = interaction.options.getString('album', true)
    const singer = interaction.options.getString('singer', true)
    const title = interaction.options.getString('title', true)
    const aliasesRaw = interaction.options.getString('aliases', true)
    const duration = interaction.options.getInteger('duration', true)
    let folderPath = interaction.options.getString('path', true)

    // Chuẩn hóa path: bỏ dấu gạch chéo ở đầu nếu có
    if (folderPath.startsWith('/')) {
      folderPath = folderPath.substring(1)
    }
    // Đảm bảo không có dấu gạch chéo ở cuối
    if (folderPath.endsWith('/')) {
      folderPath = folderPath.slice(0, -1)
    }

    const aliases = aliasesRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    const song = await MusicQuizSongRepository.create({
      album,
      singer,
      title,
      aliases,
      duration,
      opusUrl: `${folderPath}/song.opus`,
      thumbUrl: `${folderPath}/thumbnail.jpg`
    })

    return InteractionUtil.replySuccess(
      interaction,
      `Đã thêm bài hát **${song.title}** thành công!`,
      `• Album: ${song.album}\n` +
        `• Singer: ${song.singer}\n` +
        `• Path: \`${folderPath}\``
    )
  }
}
