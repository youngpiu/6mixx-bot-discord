import { container } from '@sapphire/pieces'
import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import {
  WhoknowsResult,
  batchAsync,
  formatWhoknowsContainer
} from '~/modules/lastfm/commands/_fmWhoknowsBase'
import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import {
  LastFmApiService,
  LastFmImage
} from '~/modules/lastfm/services/lastFmApiService'
import { LastFmCacheService } from '~/modules/lastfm/services/lastFmCacheService'
import { LastFmScraperService } from '~/modules/lastfm/services/lastFmScraperService'

export class LastFmWhoknowsAlbumCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return

    const nameOption = interaction.options.getString('name')
    const artistOption = interaction.options.getString('artist')
    const account = await LastFmRepository.findAccount(interaction.user.id)

    let albumName = nameOption || ''
    let artistName = artistOption || ''

    if (!albumName && account) {
      try {
        const recent = await LastFmApiService.getRecentTracks(
          account.lastfmUsername,
          1
        )
        const track = Array.isArray(recent.recenttracks.track)
          ? recent.recenttracks.track[0]
          : recent.recenttracks.track
        if (track) {
          albumName = track.album?.['#text'] || ''
          artistName =
            artistName ||
            (typeof track.artist === 'string'
              ? track.artist
              : track.artist.name || track.artist['#text'] || '')
        }
      } catch {
        // Fallback if recent track fetch fails
      }
    }

    if (!albumName || !artistName) {
      throw new NormalError(
        'Vui lòng cung cấp tên album và nghệ sĩ hoặc đang nghe nhạc.'
      )
    }

    await interaction.deferReply()

    try {
      const result = await this.handleAlbum(
        interaction.guildId,
        artistName,
        albumName
      )

      if (result.error === 'NO_MEMBERS') {
        throw new NormalError(
          'Chưa có thành viên nào trong server này liên kết Last.fm.'
        )
      }

      if (result.scores.length === 0) {
        throw new NormalError(
          `Không ai trong server này từng nghe album **${result.entryName}** của **${result.artistName}**.`
        )
      }

      result.thumbnail =
        result.thumbnail ||
        (await LastFmScraperService.scrapeArtistImage(result.artistName)) ||
        undefined

      const container = formatWhoknowsContainer('album', result, result.scores)

      return InteractionUtil.replyWithContainer(interaction, container)
    } catch (e) {
      if (e instanceof NormalError) throw e
      container.logger.error('[LastFmWhoknowsAlbumCommand] Error:', e)
      throw new NormalError(
        'Đã có lỗi xảy ra khi thực hiện lệnh whoknows album.'
      )
    }
  }

  private static async handleAlbum(
    guildId: string,
    artistName: string,
    albumName: string
  ): Promise<WhoknowsResult> {
    return LastFmCacheService.rememberWhoknowsalbum(
      guildId,
      artistName,
      albumName,
      async () => {
        const guildMembers = await LastFmRepository.getGuildFmMembers(guildId)
        if (guildMembers.length === 0)
          return {
            scores: [],
            artistName,
            entryName: albumName,
            error: 'NO_MEMBERS'
          }

        let finalArtistName = artistName
        let finalAlbumName = albumName
        let thumbnail: string | undefined
        const memberScores = await batchAsync(
          guildMembers,
          5,
          async (member) => {
            try {
              const data = await LastFmApiService.getAlbumInfo(
                artistName,
                albumName,
                member.lastfmUsername
              )
              if (data.album.artist) {
                finalArtistName =
                  typeof data.album.artist === 'string'
                    ? data.album.artist
                    : data.album.artist
              }
              if (data.album.name) finalAlbumName = data.album.name
              if (!thumbnail) {
                thumbnail =
                  data.album.image.find(
                    (i: LastFmImage) => i.size === 'extralarge'
                  )?.['#text'] ||
                  data.album.image.find(
                    (i: LastFmImage) => i.size === 'large'
                  )?.['#text']
              }
              const count = parseInt(data.album.userplaycount || '0', 10)
              return { userId: member.userId, count }
            } catch {
              return { userId: member.userId, count: 0 }
            }
          }
        )

        const sortedScores = memberScores
          .filter((s) => s.count > 0)
          .sort((a, b) => b.count - a.count)
        return {
          scores: sortedScores,
          artistName: finalArtistName,
          entryName: finalAlbumName,
          thumbnail
        }
      }
    )
  }
}
