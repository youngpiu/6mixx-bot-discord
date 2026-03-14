import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  SectionBuilder
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import { LastFmApiService } from '~/modules/lastfm/services/lastFmApiService'
import { LastFmScraperService } from '~/modules/lastfm/services/lastFmScraperService'

export class LastFmArtistCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const targetUser = interaction.options.getUser('user') || interaction.user
    const artistOption = interaction.options.getString('name')
    const viewType = interaction.options.getString('type') || 'overview'

    const account = await LastFmRepository.findAccount(targetUser.id)
    if (!account) {
      const msg =
        targetUser.id === interaction.user.id
          ? 'Bạn chưa liên kết tài khoản Last.fm. Hãy dùng lệnh `/fm set` để liên kết.'
          : `Người dùng **${targetUser.username}** chưa liên kết tài khoản Last.fm.`
      throw new NormalError(msg)
    }

    let artistName = artistOption
    if (!artistName) {
      // Get currently playing artist if no name provided
      const recentTracks = await LastFmApiService.getRecentTracks(
        account.lastfmUsername,
        1
      )
      const track = Array.isArray(recentTracks.recenttracks.track)
        ? recentTracks.recenttracks.track[0]
        : recentTracks.recenttracks.track

      if (!track) {
        throw new NormalError(
          'Không tìm thấy dữ liệu nghe nhạc gần đây để lấy tên nghệ sĩ.'
        )
      }
      artistName =
        typeof track.artist === 'string'
          ? track.artist
          : track.artist.name || track.artist['#text'] || ''
    }

    if (!artistName) {
      throw new NormalError('Vui lòng cung cấp tên nghệ sĩ.')
    }

    try {
      const artistInfo = await LastFmApiService.getArtistInfo(
        artistName,
        account.lastfmUsername
      )
      if (!artistInfo?.artist) {
        throw new NormalError(
          `Không tìm thấy thông tin cho nghệ sĩ **${artistName}**.`
        )
      }

      const artist = artistInfo.artist

      // Handle the new view types
      if (viewType === 'toptracks' || viewType === 'topalbums') {
        const type = viewType === 'toptracks' ? 'tracks' : 'albums'
        const items = await LastFmScraperService.scrapeArtistLibraryItems(
          account.lastfmUsername,
          artist.name,
          type
        )

        if (items.length === 0) {
          throw new NormalError(
            `Bạn chưa nghe ${type === 'tracks' ? 'bài hát' : 'album'} nào của **${artist.name}**.`
          )
        }

        const list = items
          .slice(0, 15)
          .map((item, i) => {
            return `${i + 1}. **${item.name}** : ${item.count} lượt nghe`
          })
          .join('\n')

        const container = new ContainerBuilder().addTextDisplayComponents((t) =>
          t.setContent(
            `### Top ${type === 'tracks' ? 'bài hát' : 'album'} của ${artist.name}\n${list}`
          )
        )

        return InteractionUtil.replyWithContainer(interaction, container, false)
      }

      // Default: Overview
      const stats = artist.stats
      const bio = artist.bio.summary.split('<a href')[0] // Strip "Read more" link

      // Try to get HD image from scraper
      const imageUrl = await LastFmScraperService.scrapeArtistImage(artist.name)

      const container = new ContainerBuilder()
        .addSectionComponents((s: SectionBuilder) =>
          s
            .addTextDisplayComponents((t) =>
              t.setContent(
                `### [${artist.name}](https://www.last.fm/music/${encodeURIComponent(artist.name)})\n${bio || 'Không có tiểu sử.'}`
              )
            )
            .setThumbnailAccessory((thumb) => thumb.setURL(imageUrl || ''))
        )
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) => {
          return t.setContent(
            `**Người nghe:** ${parseInt(stats.listeners, 10).toLocaleString()}\n**Tổng lượt nghe:** ${parseInt(stats.playcount, 10).toLocaleString()}\n**Lượt nghe của bạn:** ${parseInt(stats.userplaycount || '0', 10).toLocaleString()}`
          )
        })

      return InteractionUtil.replyWithContainer(interaction, container, false)
    } catch (e) {
      if (e instanceof NormalError) throw e
      console.error(e)
      throw new NormalError('Đã có lỗi xảy ra khi lấy dữ liệu nghệ sĩ.')
    }
  }
}
