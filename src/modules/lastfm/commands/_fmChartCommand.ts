import { container } from '@sapphire/pieces'
import { AttachmentBuilder, ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import { LastFmApiService } from '~/modules/lastfm/services/lastFmApiService'
import { LastFmImageService } from '~/modules/lastfm/services/lastFmImageService'

export class LastFmChartCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const targetUser = interaction.options.getUser('user') || interaction.user
    const period = interaction.options.getString('period') || '7day'
    let size = interaction.options.getInteger('size') || 3

    if (size < 1) size = 1
    if (size > 10) size = 10

    const account = await LastFmRepository.findAccount(targetUser.id)
    if (!account) {
      const msg =
        targetUser.id === interaction.user.id
          ? 'Bạn chưa liên kết tài khoản Last.fm. Hãy dùng lệnh `/fm set` để liên kết.'
          : `Người dùng **${targetUser.username}** chưa liên kết tài khoản Last.fm.`
      throw new NormalError(msg)
    }

    try {
      const limit = size * size
      const data = await LastFmApiService.getUserTopAlbums(
        account.lastfmUsername,
        period,
        limit
      )
      const albums = data.topalbums.album

      if (albums.length === 0) {
        throw new NormalError('Không có đủ dữ liệu album để tạo chart.')
      }

      const items = albums.map((album) => ({
        url:
          album.image.find((i) => i.size === 'large')?.['#text'] ||
          album.image.find((i) => i.size === 'extralarge')?.['#text'] ||
          '',
        title: album.name,
        subtitle: album.artist.name,
        stats: album.playcount
      }))

      // If chart is large, offload to background task
      if (size > 3) {
        await interaction.editReply(
          `🔄 Đang tạo chart ${size}x${size} cho **${targetUser.username}**... Việc này có thể mất vài giây.`
        )

        await container.tasks.create(
          {
            name: 'lastFmChart',
            payload: {
              items,
              size,
              interactionToken: interaction.token,
              applicationId: interaction.applicationId!,
              content: `Chart album của **${targetUser.username}** (${period}):`
            }
          },
          { repeated: false, delay: 0 }
        )
        return
      }

      // For small charts, we can still render in-process but use the service
      const buffer = await LastFmImageService.renderChart(items, size, size)
      const attachment = new AttachmentBuilder(buffer, { name: 'chart.jpg' })

      return interaction.editReply({
        content: `Chart album của **${targetUser.username}** (${period}):`,
        files: [attachment]
      })
    } catch (e) {
      if (e instanceof NormalError) throw e
      container.logger.error('[LastFmChartCommand] Error:', e)
      throw new NormalError('Đã có lỗi xảy ra khi tạo chart.')
    }
  }
}
