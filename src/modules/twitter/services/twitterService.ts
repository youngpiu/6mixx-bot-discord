import { NormalError } from '~/core/errorResponse'

import type {
  FXTwitterMediaItem,
  FXTwitterResponse,
  TweetData,
  TwitterMedia
} from '../types/twitterTypes'
import { TwitterCacheService } from './twitterCacheService'

export class TwitterService {
  /**
   * Extracts the tweet ID from a given Twitter or X URL.
   *
   * @param url The URL string to parse (e.g. https://x.com/username/status/123456789)
   * @returns The extracted tweet ID if found, otherwise null.
   */
  public static extractTweetIdFromUrl(url: string): string | null {
    const match = url.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/)
    return match ? match[1]! : null
  }

  /**
   * Fetches tweet data via the fxtwitter API, returning standard info (with caching).
   *
   * @param tweetId The ID of the tweet
   * @returns The parsed TweetData structure
   * @throws NormalError if the API returns an error or if no media is found.
   */
  public static async fetchTweetData(tweetId: string): Promise<TweetData> {
    return TwitterCacheService.rememberTweet(tweetId, async () => {
      const response = await fetch(
        `https://api.fxtwitter.com/u/status/${tweetId}`
      )

      if (!response.ok) {
        throw new NormalError(
          `Không thể lấy thông tin từ X/Twitter cho ID \`${tweetId}\``
        )
      }

      const data = (await response.json()) as FXTwitterResponse
      const tweet = data.tweet

      if (!tweet) {
        throw new NormalError(
          `Dữ liệu từ X phản hồi không hợp lệ cho ID \`${tweetId}\``
        )
      }

      // Determine array of media
      let medias: FXTwitterMediaItem[] = []
      if (tweet.media_extended) {
        medias = tweet.media_extended
      } else if (tweet.media && tweet.media.all) {
        medias = tweet.media.all
      }

      // Extract specific fields
      const mediaList: TwitterMedia[] = medias.map((m) => ({
        type: m.type,
        url:
          m.type === 'photo' || m.type === 'image'
            ? this.optimizeImageUrl(m.url)
            : m.url
      }))

      // Screen name / Username
      const screenName =
        tweet.author?.screen_name || tweet.user_screen_name || 'unknown'
      const username = tweet.author?.name || tweet.user_name || screenName

      // Date
      const timestamp = tweet.created_timestamp || Math.floor(Date.now() / 1000)

      return {
        tweetId,
        username,
        screenName,
        text: tweet.text || '',
        timestamp,
        media: mediaList,
        replies: tweet.replies,
        retweets: tweet.retweets,
        likes: tweet.likes,
        bookmarks: tweet.bookmarks
      }
    })
  }

  /**
   * Helper function to remove `t.co` links from the end of a tweet text.
   */
  public static removeTcoLink(text: string): string {
    if (text.startsWith('https://t.co')) {
      return ''
    }

    const parts = text.split(/\s+/)
    if (
      parts.length > 0 &&
      parts[parts.length - 1]!.startsWith('https://t.co')
    ) {
      return parts.slice(0, -1).join(' ')
    }

    return text
  }

  /**
   * Transforms a Twitter image URL to use the highest available resolution (?name=orig).
   */
  public static optimizeImageUrl(url: string): string {
    if (!url.includes('pbs.twimg.com/media/')) return url

    try {
      const urlObj = new URL(url)
      // Remove format parameter if present to let Discord handle it or keep it clean
      // Actually, format is usually needed (jpg/png), but name is the size.
      urlObj.searchParams.set('name', 'orig')
      return urlObj.toString()
    } catch {
      return url
    }
  }
}
