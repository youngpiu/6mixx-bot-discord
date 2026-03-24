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
    const igUrl = `https://www.instagram.com/p/${shortcode}//`
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

        // Use a Set to track URLs and avoid duplicates
        const seenUrls = new Set<string>()

        // Find all media items. .media-item is the class for img/video element itself.
        $('.media-item').each((_, el) => {
          const $el = $(el)
          let type: 'image' | 'video' | undefined
          let url: string | undefined

          if ($el.is('video')) {
            type = 'video'
            url = $el.find('source').attr('src') || $el.attr('src')
          } else if ($el.is('img')) {
            type = 'image'
            url = $el.attr('src')
          }

          if (type && url && !seenUrls.has(url)) {
            seenUrls.add(url)
            mediaList.push({ type, url })
          }
        })

        // Fallback to meta tags if no items found in body
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
