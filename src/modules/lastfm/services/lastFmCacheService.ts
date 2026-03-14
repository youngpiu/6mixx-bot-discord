import { TIME } from '~/shared/constants/timeConstant'
import { CacheService } from '~/shared/services/cacheService'

/**
 * Service for managing Last.fm related cache using Redis.
 * Centralizes key management and uses the shared CacheService.
 */
export class LastFmCacheService {
  private static readonly TTL_WHOKNOWS_ARTIST = TIME.H2 // Artist: 2 giờ
  private static readonly TTL_WHOKNOWS_TRACK = TIME.H1 // Track: 1 giờ
  private static readonly TTL_WHOKNOWS_ALBUM = TIME.H1 // Album: 1 giờ
  private static readonly TTL_SESSION = TIME.D7

  // --- Cache Keys ---
  private static getWhoknowsKey(guildId: string, artist: string) {
    return `fm:whoknows:${guildId}:${artist.toLowerCase()}`
  }

  private static getWhoknowstrackKey(
    guildId: string,
    artist: string,
    track: string
  ) {
    return `fm:whoknows:track:${guildId}:${artist.toLowerCase()}:${track.toLowerCase()}`
  }

  private static getWhoknowsalbumKey(
    guildId: string,
    artist: string,
    album: string
  ) {
    return `fm:whoknows:album:${guildId}:${artist.toLowerCase()}:${album.toLowerCase()}`
  }

  private static getSessionKey() {
    return 'lastfm:session:cookie'
  }

  /**
   * Caches or retrieves Whoknows leaderboard data.
   */
  public static async rememberWhoknows<T>(
    guildId: string,
    artist: string,
    fetcher: () => Promise<T>
  ) {
    return CacheService.remember(
      this.getWhoknowsKey(guildId, artist),
      this.TTL_WHOKNOWS_ARTIST,
      fetcher
    )
  }

  /**
   * Caches or retrieves Whoknowstrack leaderboard data.
   */
  public static async rememberWhoknowstrack<T>(
    guildId: string,
    artist: string,
    track: string,
    fetcher: () => Promise<T>
  ) {
    return CacheService.remember(
      this.getWhoknowstrackKey(guildId, artist, track),
      this.TTL_WHOKNOWS_TRACK,
      fetcher
    )
  }

  /**
   * Caches or retrieves Whoknowsalbum leaderboard data.
   */
  public static async rememberWhoknowsalbum<T>(
    guildId: string,
    artist: string,
    album: string,
    fetcher: () => Promise<T>
  ) {
    return CacheService.remember(
      this.getWhoknowsalbumKey(guildId, artist, album),
      this.TTL_WHOKNOWS_ALBUM,
      fetcher
    )
  }

  /**
   * Gets the stored session cookie.
   */
  public static async getSessionCookie(): Promise<string | null> {
    return CacheService.getRaw(this.getSessionKey())
  }

  /**
   * Sets the session cookie.
   */
  public static async setSessionCookie(cookie: string): Promise<void> {
    await CacheService.setRaw(
      this.getSessionKey(),
      cookie,
      this.TTL_SESSION / 1000
    )
  }

  /**
   * Invalidates Whoknows cache for a specific artist.
   */
  public static async invalidateWhoknows(
    guildId: string,
    artist: string
  ): Promise<void> {
    await CacheService.invalidate(this.getWhoknowsKey(guildId, artist))
  }
}
