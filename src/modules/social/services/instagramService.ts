import { container } from '@sapphire/framework'
import * as cheerio from 'cheerio'

import {
  InstagramMedia,
  InstagramPostData
} from '~/modules/social/types/instagramTypes'

export class InstagramService {
  public static shortcodeToId(shortcode: string): bigint {
    const code = shortcode.padStart(12, 'A')
    const buffer = Buffer.from(
      code.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    )
    // Convert buffer to BigInt (Big Endian)
    let res = 0n
    for (let i = 0; i < buffer.length; i++) {
      res = (res << 8n) | BigInt(buffer[i]!)
    }
    return res
  }

  public static pkToTimestamp(pk: bigint): number {
    const igEpoch = 1314220021
    // IG ID is [41 bits timestamp since IG epoch][13 bits shard][10 bits sequence]
    const timestampMs = pk >> 23n
    const timestamp = Number(timestampMs) / 1000
    return Math.floor(igEpoch + timestamp)
  }

  public static extractShortcode(url: string): string | null {
    const regex = /(?:\/p\/|\/reel\/|\/reels\/|\/tv\/)([A-Za-z0-9_-]+)/
    const match = url.match(regex)
    return match ? match[1]! : null
  }

  public static async fetchInstagramData(
    shortcode: string
  ): Promise<InstagramPostData> {
    const igUrl = `https://www.instagram.com/p/${shortcode}/`
    let username = 'unknown'
    let caption = ''
    const mediaList: InstagramMedia[] = []
    let timestamp: number | undefined

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'
    }

    // 1. Fetch media from vxinstagram
    try {
      const vxResponse = await fetch(
        `https://vxinstagram.com/p/${shortcode}/`,
        {
          headers
        }
      )
      if (vxResponse.ok) {
        const vxHtml = await vxResponse.text()
        const $ = cheerio.load(vxHtml)

        // Try to find all media items (for carousels)
        const mediaContainers = $('.carousel-item, .media-container')

        if (mediaContainers.length > 0) {
          mediaContainers.each((_, el) => {
            const $el = $(el)

            // Check for video first
            const videoSrc =
              $el.find('video source').attr('src') ||
              $el.find('video').attr('src')
            if (videoSrc) {
              mediaList.push({ type: 'video', url: videoSrc })
            } else {
              // Check for image
              const imgSrc = $el.find('img').attr('src')
              if (imgSrc) {
                mediaList.push({ type: 'image', url: imgSrc })
              }
            }
          })
        }

        // Fallback to meta tags if no containers found
        if (mediaList.length === 0) {
          const ogVideo = $('meta[property="og:video"]').attr('content')
          const ogImage =
            $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content')

          if (ogVideo) {
            mediaList.push({ type: 'video', url: ogVideo })
          } else if (ogImage) {
            mediaList.push({ type: 'image', url: ogImage })
          }
        }
      }
    } catch (error) {
      container.logger.error(
        `[InstagramService] Error fetching from vxinstagram for ${shortcode}:`,
        error
      )
    }

    // 2. Fetch username and description from uuinstagram
    try {
      const uuResponse = await fetch(
        `https://uuinstagram.com/p/${shortcode}/`,
        {
          headers
        }
      )
      if (uuResponse.ok) {
        const uuHtml = await uuResponse.text()
        const $ = cheerio.load(uuHtml)

        const extractedUsername =
          $('meta[name="twitter:title"]').attr('content') ||
          $('meta[property="og:title"]').attr('content')
        if (extractedUsername) {
          username = extractedUsername.replace('@', '').trim()
        }

        const extractedCaption =
          $('meta[property="og:description"]').attr('content') ||
          $('meta[name="twitter:description"]').attr('content')
        if (extractedCaption) {
          caption = extractedCaption.trim()
        }
      }
    } catch (error) {
      container.logger.error(
        `[InstagramService] Error fetching from uuinstagram for ${shortcode}:`,
        error
      )
    }

    // Calculate timestamp as fallback
    try {
      const id = this.shortcodeToId(shortcode)
      timestamp = this.pkToTimestamp(id)
    } catch {
      // Ignored
    }

    if (username === 'unknown' && mediaList.length === 0) {
      throw new Error(
        'Không thể lấy dữ liệu từ Instagram. Vui lòng thử lại sau.'
      )
    }

    // Final normalization: ensure URLs are absolute if they start with /
    const normalizedMedia = mediaList.map((m) => ({
      ...m,
      url: m.url.startsWith('/') ? `https://vxinstagram.com${m.url}` : m.url
    }))

    return {
      shortcode,
      username,
      caption,
      media: normalizedMedia,
      timestamp,
      url: igUrl
    }
  }
}
