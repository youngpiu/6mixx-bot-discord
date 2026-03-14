import { container } from '@sapphire/pieces'

import { NormalError } from '~/core/errorResponse'

import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import { LastFmApiService } from '~/modules/lastfm/services/lastFmApiService'
import { LastFmMilestoneService } from '~/modules/lastfm/services/lastFmMilestoneService'

export class LastFmService {
  /**
   * Fetches the "Now Playing" or "Last Played" track for a user with full metadata.
   */
  public static async getNowPlaying(userId: string) {
    const account = await LastFmRepository.findAccount(userId)
    if (!account) {
      throw new NormalError(
        'Bạn chưa liên kết tài khoản Last.fm. Hãy dùng lệnh `/fm set` để liên kết.'
      )
    }

    try {
      const recentTracks = await LastFmApiService.getRecentTracks(
        account.lastfmUsername,
        1
      )
      const tracks = recentTracks.recenttracks.track
      const track = Array.isArray(tracks) ? tracks[0] : tracks

      if (!track) {
        throw new NormalError('Không tìm thấy dữ liệu nghe nhạc gần đây.')
      }

      const artistName =
        track.artist.name || track.artist['#text'] || 'Unknown Artist'
      const trackName = track.name
      const isNowPlaying = track['@attr']?.nowplaying === 'true'

      // Get personal stats and user info in parallel
      const [artistInfo, trackInfo, userInfo] = await Promise.all([
        LastFmApiService.getArtistInfo(artistName, account.lastfmUsername),
        LastFmApiService.getTrackInfo(
          artistName,
          trackName,
          account.lastfmUsername
        ),
        LastFmApiService.getUserInfo(account.lastfmUsername)
      ])

      // Check for milestones
      let milestoneReached: number | null = null
      if (userInfo?.user) {
        const currentTotal = parseInt(userInfo.user.playcount, 10)
        milestoneReached = LastFmMilestoneService.checkMilestone(
          account.totalScrobbles,
          currentTotal
        )
        await LastFmRepository.updateTotalScrobbles(userId, currentTotal)
      }

      return {
        track,
        isNowPlaying,
        userStats: {
          artistPlaycount: artistInfo?.artist?.stats?.userplaycount || 0,
          trackPlaycount: trackInfo?.track?.userplaycount || 0,
          totalScrobbles: account.totalScrobbles
        },
        account,
        milestone: milestoneReached
      }
    } catch (error) {
      if (error instanceof NormalError) throw error

      container.logger.error(
        '[LastFmService] Error fetching now playing:',
        error
      )
      throw new NormalError(
        'Đã có lỗi xảy ra khi lấy dữ liệu từ Last.fm. Vui lòng thử lại sau.'
      )
    }
  }

  /**
   * Links a Last.fm account to a Discord user.
   */
  public static async setAccount(userId: string, lastfmUsername: string) {
    try {
      // Verify account exists
      const userInfo = await LastFmApiService.getUserInfo(lastfmUsername)
      if (!userInfo?.user) {
        throw new NormalError(
          `Không tìm thấy người dùng **${lastfmUsername}** trên Last.fm.`
        )
      }

      const username = userInfo.user.name
      const account = await LastFmRepository.upsertAccount(userId, username)

      // Update total scrobbles
      await LastFmRepository.updateTotalScrobbles(
        userId,
        parseInt(userInfo.user.playcount, 10)
      )

      return account
    } catch (error) {
      if (error instanceof NormalError) throw error

      container.logger.error('[LastFmService] Error setting account:', error)
      throw new NormalError(
        'Đã có lỗi xảy ra khi liên kết tài khoản. Vui lòng thử lại sau.'
      )
    }
  }
}
