import { ChatInputCommandInteraction } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { MusicQuizSongRepository } from '../repositories/MusicQuizSongRepository'

export class MusicQuizAddSongCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
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
