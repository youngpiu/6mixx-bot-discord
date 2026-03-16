import { ChatInputCommandInteraction } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { MusicQuizSongRepository } from '~/modules/songs-quiz/repositories/MusicQuizSongRepository'

export class MusicQuizAddSongCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const playlist = interaction.options.getString('playlist', false)
    const artists = interaction.options.getString('artists', true)
    const title = interaction.options.getString('title', true)
    const aliasesRaw = interaction.options.getString('aliases', true)
    const duration = interaction.options.getInteger('duration', true)
    let folderPath = interaction.options.getString('path', true)
    const songUrl = interaction.options.getString('song-url', true)

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
      playlist: playlist ?? undefined,
      artists,
      title,
      aliases,
      duration,
      opusUrl: `${folderPath}/song.opus`,
      thumbUrl: `${folderPath}/thumbnail.jpg`,
      songUrl
    })

    return InteractionUtil.replySuccess(
      interaction,
      `Đã thêm bài hát **${song.title}** thành công!`,
      `• Danh sách phát: ${song.playlist}\n` +
        `• Nghệ sĩ: ${song.artists}\n` +
        `• Path: \`${folderPath}\``
    )
  }
}
