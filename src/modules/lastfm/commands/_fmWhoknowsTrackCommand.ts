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

export class LastFmWhoknowsTrackCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return

    const nameOption = interaction.options.getString('name')
    const artistOption = interaction.options.getString('artist')
    const account = await LastFmRepository.findAccount(interaction.user.id)

    let trackName = nameOption || ''
    let artistName = artistOption || ''

    if (!trackName && account) {
      try {
        const recent = await LastFmApiService.getRecentTracks(
          account.lastfmUsername,
          1
        )
        const track = Array.isArray(recent.recenttracks.track)
          ? recent.recenttracks.track[0]
          : recent.recenttracks.track
        if (track) {
          trackName = track.name
          artistName =
            artistName ||
            (typeof track.artist === 'string'
              ? track.artist
              : track.artist.name || track.artist['#text'] || '')
        }
      } catch {
        // Fallback to manual options if recent track fetch fails
      }
    }

    if (!trackName || !artistName) {
      throw new NormalError(
        'Vui lòng cung cấp tên bài hát và nghệ sĩ hoặc đang nghe nhạc.'
      )
    }

    await interaction.deferReply()

    try {
      const result = await this.handleTrack(
        interaction.guildId,
        artistName,
        trackName
      )

      if (result.error === 'NO_MEMBERS') {
        throw new NormalError(
          'Chưa có thành viên nào trong server này liên kết Last.fm.'
        )
      }

      if (result.scores.length === 0) {
        throw new NormalError(
          `Không ai trong server này từng nghe bài hát **${result.entryName}** của **${result.artistName}**.`
        )
      }

      result.thumbnail =
        result.thumbnail ||
        (await LastFmScraperService.scrapeArtistImage(result.artistName)) ||
        undefined

      const container = formatWhoknowsContainer('track', result, result.scores)

      return InteractionUtil.replyWithContainer(interaction, container)
    } catch (e) {
      if (e instanceof NormalError) throw e
      container.logger.error('[LastFmWhoknowsTrackCommand] Error:', e)
      throw new NormalError(
        'Đã có lỗi xảy ra khi thực hiện lệnh whoknows track.'
      )
    }
  }

  private static async handleTrack(
    guildId: string,
    artistName: string,
    trackName: string
  ): Promise<WhoknowsResult> {
    return LastFmCacheService.rememberWhoknowstrack(
      guildId,
      artistName,
      trackName,
      async () => {
        const guildMembers = await LastFmRepository.getGuildFmMembers(guildId)
        if (guildMembers.length === 0)
          return {
            scores: [],
            artistName,
            entryName: trackName,
            error: 'NO_MEMBERS'
          }

        let finalArtistName = artistName
        let finalTrackName = trackName
        let thumbnail: string | undefined
        const memberScores = await batchAsync(
          guildMembers,
          5,
          async (member) => {
            try {
              const data = await LastFmApiService.getTrackInfo(
                artistName,
                trackName,
                member.lastfmUsername
              )
              if (data.track.artist.name)
                finalArtistName = data.track.artist.name
              if (data.track.name) finalTrackName = data.track.name
              if (!thumbnail && data.track.album?.image) {
                thumbnail =
                  data.track.album.image.find(
                    (i: LastFmImage) => i.size === 'extralarge'
                  )?.['#text'] ||
                  data.track.album.image.find(
                    (i: LastFmImage) => i.size === 'large'
                  )?.['#text']
              }
              const count = parseInt(data.track.userplaycount || '0', 10)
              return { userId: member.userId, count }
            } catch {
              // Ignore errors for members who haven't listened to the track
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
          entryName: finalTrackName,
          thumbnail
        }
      }
    )
  }
}
