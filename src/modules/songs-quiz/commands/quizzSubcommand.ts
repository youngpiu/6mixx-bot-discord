import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { MusicQuizSongRepository } from '../repositories/MusicQuizSongRepository'

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
    }
  ]
})
export class QuizzSubcommand extends Subcommand {
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
