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

export class LastFmAlbumCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const targetUser = interaction.options.getUser('user') || interaction.user
    const albumOption = interaction.options.getString('album')
    const artistOption = interaction.options.getString('artist')
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
    let albumName = albumOption

    if (!albumName) {
      // Get currently playing album if no name provided
      const recentTracks = await LastFmApiService.getRecentTracks(
        account.lastfmUsername,
        1
      )
      const track = Array.isArray(recentTracks.recenttracks.track)
        ? recentTracks.recenttracks.track[0]
        : recentTracks.recenttracks.track

      if (!track || !track.album?.['#text']) {
        throw new NormalError(
          'Không tìm thấy dữ liệu album gần đây. Vui lòng cung cấp tên album.'
        )
      }
      artistName =
        artistName ||
        (typeof track.artist === 'string'
          ? track.artist
          : track.artist.name || track.artist['#text'] || '')
      albumName = track.album?.['#text'] || ''
    }

    if (!artistName) {
      throw new NormalError('Vui lòng cung cấp tên nghệ sĩ cho album này.')
    }

    try {
      const [albumInfo, metadata] = await Promise.all([
        LastFmApiService.getAlbumInfo(
          artistName,
          albumName,
          account.lastfmUsername
        ),
        LastFmScraperService.scrapeAlbumMetadata(artistName, albumName)
      ])

      if (!albumInfo?.album) {
        throw new NormalError(
          `Không tìm thấy thông tin cho album **${albumName}** của **${artistName}**.`
        )
      }

      const album = albumInfo.album
      const imageUrl =
        album.image.find((i) => i.size === 'extralarge')?.['#text'] ||
        album.image.find((i) => i.size === 'large')?.['#text']

      if (viewType === 'tracklist') {
        const tracks = album.tracks?.track
        let list = 'Không có thông tin danh sách bài hát.'
        if (tracks) {
          const trackArray = Array.isArray(tracks) ? tracks : [tracks]
          list = trackArray
            .map((t, i) => {
              const duration = t.duration
                ? ` (${Math.floor(parseInt(t.duration, 10) / 60)}:${(parseInt(t.duration, 10) % 60).toString().padStart(2, '0')})`
                : ''
              return `${i + 1}. **${t.name}**${duration}`
            })
            .join('\n')
        }

        const container = new ContainerBuilder()
          .addSectionComponents((s) =>
            s
              .addTextDisplayComponents((t) =>
                t.setContent(`### Tracklist: ${album.name}\n**${artistName}**`)
              )
              .setThumbnailAccessory((thumb) => thumb.setURL(imageUrl || ''))
          )
          .addSeparatorComponents((s) => s)
          .addTextDisplayComponents((t) => t.setContent(list))

        return InteractionUtil.replyWithContainer(interaction, container, false)
      }

      // Default: Overview

      const container = new ContainerBuilder()
        .addSectionComponents((s: SectionBuilder) =>
          s
            .addTextDisplayComponents((t) =>
              t.setContent(
                `### [${album.name}](${album.url})\n**${artistName}**`
              )
            )
            .setThumbnailAccessory((thumb) => thumb.setURL(imageUrl || ''))
        )
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) => {
          let content = `**Người nghe:** ${parseInt(album.listeners || '0', 10).toLocaleString()}\n**Tổng lượt nghe:** ${parseInt(album.playcount || '0', 10).toLocaleString()}\n**Lượt nghe của bạn:** ${parseInt(album.userplaycount || '0', 10).toLocaleString()}`
          if (metadata?.releaseDate)
            content += `\n**Ngày phát hành:** ${metadata.releaseDate}`
          if (metadata?.duration)
            content += `\n**Thời lượng:** ${metadata.duration}`
          if (album.tags?.tag?.length > 0) {
            content += `\n**Tag:** ${album.tags.tag
              .slice(0, 5)
              .map((t: { name: string }) => t.name)
              .join(', ')}`
          }
          return t.setContent(content)
        })

      return InteractionUtil.replyWithContainer(interaction, container, false)
    } catch (e) {
      if (e instanceof NormalError) throw e
      console.error(e)
      throw new NormalError('Đã có lỗi xảy ra khi lấy dữ liệu album.')
    }
  }
}
