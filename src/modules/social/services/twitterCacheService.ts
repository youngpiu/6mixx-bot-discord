import { TIME } from '~/shared/constants/timeConstant'
import { CacheService } from '~/shared/services/cacheService'

/**
 * Service for managing Twitter related cache using Redis.
 * Centralizes key management and uses the shared CacheService.
 */
export class TwitterCacheService {
  private static readonly TTL_TWITTER_TWEET = TIME.H1 // 1 hour

  // --- Cache Keys ---
  private static getTweetKey(tweetId: string) {
    return `twitter:tweet:${tweetId}`
  }

  /**
   * Caches or retrieves Tweet data.
   */
  public static async rememberTweet<T>(
    tweetId: string,
    fetcher: () => Promise<T>
  ) {
    return CacheService.remember(
      this.getTweetKey(tweetId),
      this.TTL_TWITTER_TWEET,
      fetcher
    )
  }
}
