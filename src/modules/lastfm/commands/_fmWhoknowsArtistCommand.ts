import { container } from '@sapphire/pieces'
import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import {
  WhoknowsResult,
  batchAsync,
  formatWhoknowsContainer,
  getCurrentArtist
} from '~/modules/lastfm/commands/_fmWhoknowsBase'
import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import {
  LastFmApiService,
  LastFmImage
} from '~/modules/lastfm/services/lastFmApiService'
import { LastFmCacheService } from '~/modules/lastfm/services/lastFmCacheService'
import { LastFmScraperService } from '~/modules/lastfm/services/lastFmScraperService'

export class LastFmWhoknowsArtistCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return

    const nameOption = interaction.options.getString('name')
    const account = await LastFmRepository.findAccount(interaction.user.id)

    const artistName = nameOption || (await getCurrentArtist(account)) || ''

    if (!artistName) {
      throw new NormalError(
        'Vui lòng cung cấp tên nghệ sĩ hoặc đang nghe nhạc.'
      )
    }

    await interaction.deferReply()

    try {
      const result = await this.handleArtist(interaction.guildId, artistName)

      if (result.error === 'NO_MEMBERS') {
        throw new NormalError(
          'Chưa có thành viên nào trong server này liên kết Last.fm.'
        )
      }

      if (result.scores.length === 0) {
        throw new NormalError(
          `Không ai trong server này từng nghe **${result.artistName}**.`
        )
      }

      result.thumbnail =
        result.thumbnail ||
        (await LastFmScraperService.scrapeArtistImage(result.artistName)) ||
        undefined

      const container = formatWhoknowsContainer('artist', result, result.scores)

      return InteractionUtil.replyWithContainer(interaction, container)
    } catch (e) {
      if (e instanceof NormalError) throw e
      container.logger.error('[LastFmWhoknowsArtistCommand] Error:', e)
      throw new NormalError(
        'Đã có lỗi xảy ra khi thực hiện lệnh whoknows artist.'
      )
    }
  }

  private static async handleArtist(
    guildId: string,
    artistName: string
  ): Promise<WhoknowsResult> {
    return LastFmCacheService.rememberWhoknows(
      guildId,
      artistName,
      async () => {
        const libraryScores = await LastFmRepository.getWhoknowsFromLibrary(
          guildId,
          artistName
        )
        if (libraryScores.length > 0) {
          return {
            scores: libraryScores.map((r) => ({
              userId: r.userId,
              count: r.playCount
            })),
            artistName
          }
        }

        const guildMembers = await LastFmRepository.getGuildFmMembers(guildId)
        if (guildMembers.length === 0)
          return { scores: [], artistName, error: 'NO_MEMBERS' }

        let finalArtistName = artistName
        let thumbnail: string | undefined
        const memberScores = await batchAsync(
          guildMembers,
          5,
          async (member) => {
            try {
              const data = await LastFmApiService.getArtistInfo(
                artistName,
                member.lastfmUsername
              )
              if (data.artist.name) finalArtistName = data.artist.name
              if (!thumbnail && data.artist.image) {
                thumbnail =
                  data.artist.image.find(
                    (i: LastFmImage) => i.size === 'extralarge'
                  )?.['#text'] ||
                  data.artist.image.find(
                    (i: LastFmImage) => i.size === 'large'
                  )?.['#text']
              }
              const count = parseInt(data.artist.stats.userplaycount || '0', 10)
              return { userId: member.userId, count }
            } catch {
              // Fallback to manual options if recent track fetch fails
              return { userId: member.userId, count: 0 }
            }
          }
        )

        const sortedScores = memberScores
          .filter((s) => s.count > 0)
          .sort((a, b) => b.count - a.count)
        return { scores: sortedScores, artistName: finalArtistName, thumbnail }
      }
    )
  }
}
