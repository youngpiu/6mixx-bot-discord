import { container } from '@sapphire/pieces'

export interface TwitterMedia {
  url: string
  type: 'image' | 'video' | 'gif'
}

export interface TwitterPostInfo {
  text: string
  media: TwitterMedia[]
  authorName: string
  authorScreenName: string
}

export class TwitterService {
  /**
   * Extracts the tweet ID from a given X/Twitter URL.
   */
  public static extractTweetId(url: string): string | null {
    const match = url.match(
      /(?:x\.com|twitter\.com)\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/
    )
    return match ? match[3] : null
  }

  /**
   * Fetches tweet information using the vxtwitter API.
   */
  public static async getTweetInfo(
    url: string
  ): Promise<TwitterPostInfo | null> {
    const tweetId = this.extractTweetId(url)
    if (!tweetId) return null

    try {
      const response = await fetch(
        `https://api.vxtwitter.com/Twitter/status/${tweetId}`
      )
      if (!response.ok) return null

      const data = await response.json()

      const parsedMedia =
        data.media_extended?.map((m: { url: string; type: string }) => ({
          url: m.url,
          type: m.type as TwitterMedia['type']
        })) ||
        data.mediaURLs?.map((url: string) => ({
          url,
          type: 'image'
        })) ||
        []

      return {
        text: data.text || '',
        media: parsedMedia,
        authorName: data.user_name || '',
        authorScreenName: data.user_screen_name || ''
      }
    } catch (error) {
      container.logger.error(
        '[TwitterService] Error fetching tweet info:',
        error
      )
      return null
    }
  }
}
