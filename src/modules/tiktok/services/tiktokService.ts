import { NormalError } from '~/core/errorResponse'

import type { TikTokData, TikWMResponse } from '../types/tiktokTypes'

export class TikTokService {
  /**
   * Extracts the video ID from a given TikTok URL.
   * Supports mobile links, desktop links, and direct video IDs.
   */
  public static extractVideoIdFromUrl(url: string): string | null {
    // Standard URL: https://www.tiktok.com/@user/video/7597295172971433234
    const match = url.match(/video\/(\d+)/)
    if (match) return match[1]!

    // Direct ID
    if (/^\d+$/.test(url)) return url

    return null
  }

  /**
   * Fetches TikTok video data via tikwm.com API.
   */
  public static async fetchTikTokData(videoId: string): Promise<TikTokData> {
    const url = `https://www.tiktok.com/@user/video/${videoId}`
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`

    try {
      const response = await fetch(apiUrl)
      if (!response.ok) {
        throw new Error('API request failed')
      }

      const result = (await response.json()) as TikWMResponse
      if (result.code !== 0 || !result.data) {
        throw new Error(result.msg || 'Unknown API error')
      }

      return result.data
    } catch (e) {
      throw new NormalError(
        `Không thể lấy thông tin từ TikTok cho ID \`${videoId}\`. (${(e as Error).message})`
      )
    }
  }
}
