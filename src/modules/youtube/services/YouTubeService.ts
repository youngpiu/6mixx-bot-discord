import { request } from 'undici'

import { env } from '~/shared/config/env'

export interface YouTubeThumbnail {
  url: string
  width: number
  height: number
}

export interface YouTubeVideoInfo {
  kind: string
  etag: string
  id: string
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: {
      default?: YouTubeThumbnail
      medium?: YouTubeThumbnail
      high?: YouTubeThumbnail
      standard?: YouTubeThumbnail
      maxres?: YouTubeThumbnail
    }
    channelTitle: string
    categoryId: string
    liveBroadcastContent: 'live' | 'none' | 'upcoming'
    defaultLanguage?: string
    localized: {
      title: string
      description: string
    }
    defaultAudioLanguage?: string
  }
  contentDetails: {
    duration: string
    dimension: string
    definition: 'hd' | 'sd'
    caption: 'true' | 'false'
    licensedContent: boolean
    contentRating: Record<string, unknown>
    projection: 'rectangular' | '360'
  }
  statistics: {
    viewCount: string
    likeCount: string
    favoriteCount: string
    commentCount: string
  }
  liveStreamingDetails?: {
    actualStartTime?: string
    scheduledStartTime?: string
    concurrentViewers?: string
    activeLiveChatId?: string
  }
}

export interface YouTubeChannelInfo {
  snippet: {
    title: string
    thumbnails: {
      default?: YouTubeThumbnail
      medium?: YouTubeThumbnail
      high?: YouTubeThumbnail
    }
  }
}

export interface YouTubeApiResponse<T> {
  kind: string
  etag: string
  items?: T[]
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
}

export class YouTubeService {
  private static readonly API_KEY = env.YOUTUBE_API_KEY
  private static readonly BASE_URL = 'https://www.googleapis.com/youtube/v3'

  public static async getVideoInfo(
    videoUrl: string
  ): Promise<YouTubeVideoInfo | null> {
    const videoId = this.extractVideoId(videoUrl)
    if (!videoId) return null

    try {
      const { body } = await request(
        `${this.BASE_URL}/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${videoId}&key=${this.API_KEY}`
      )
      const data = (await body.json()) as YouTubeApiResponse<YouTubeVideoInfo>

      if (!data.items || data.items.length === 0) return null

      return data.items[0]
    } catch (error) {
      console.error('[YouTubeService] Error fetching video info:', error)
      return null
    }
  }

  public static async getChannelInfo(
    channelId: string
  ): Promise<YouTubeChannelInfo | null> {
    try {
      const { body } = await request(
        `${this.BASE_URL}/channels?part=snippet&id=${channelId}&key=${this.API_KEY}`
      )
      const data = (await body.json()) as YouTubeApiResponse<YouTubeChannelInfo>

      if (!data.items || data.items.length === 0) return null

      return data.items[0]
    } catch (error) {
      console.error('[YouTubeService] Error fetching channel info:', error)
      return null
    }
  }

  public static extractVideoId(url: string): string | null {
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
  }
}
