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

    // Proxy deduplication helper
    const getDeepUrlKey = (url: string) => {
      // For vxinstagram/ddinstagram URLs, the underlying source is in the token param (JWT)
      const match = url.match(/[?&]token=([^&]+)/)
      if (!match) return url
      try {
        const payloadStr = match[1]!.split('.')[1]
        if (!payloadStr) return url
        const payload = JSON.parse(
          Buffer.from(payloadStr, 'base64').toString('utf8')
        )
        // Deduplicate by the actual Instagram CDN URL
        return payload.url || url
      } catch {
        return url
      }
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

        // Use a Set to track underlying source URLs and avoid duplicates (vx often doubles items in HTML)
        const seenSourceUrls = new Set<string>()

        // Find all media containers (works for both single posts and carousels)
        $('.media-container').each((_, el) => {
          const $el = $(el)

          // Check for video first
          const videoSrc =
            $el.find('video source').attr('src') ||
            $el.find('video').attr('src')
          if (videoSrc) {
            const absoluteUrl = videoSrc.startsWith('/')
              ? `https://vxinstagram.com${videoSrc}`
              : videoSrc
            const key = getDeepUrlKey(absoluteUrl)

            if (!seenSourceUrls.has(key)) {
              seenSourceUrls.add(key)
              mediaList.push({ type: 'video', url: absoluteUrl })
            }
            return // Skip image if video found in same container
          }

          // Check for image
          const imgSrc = $el.find('img').attr('src')
          if (imgSrc) {
            const absoluteUrl = imgSrc.startsWith('/')
              ? `https://vxinstagram.com${imgSrc}`
              : imgSrc
            const key = getDeepUrlKey(absoluteUrl)

            if (!seenSourceUrls.has(key)) {
              seenSourceUrls.add(key)
              mediaList.push({ type: 'image', url: absoluteUrl })
            }
          }
        })

        // Fallback to meta tags ONLY if no individual items found in body
        if (mediaList.length === 0) {
          const ogVideo = $('meta[property="og:video"]').attr('content')
          const ogImage =
            $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content')

          if (ogVideo) {
            mediaList.push({ type: 'video', url: ogVideo })
          } else if (ogImage) {
            // Check if it's a grid image - we prefer individual items, but if none found, we take it
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

    return {
      shortcode,
      username,
      caption,
      media: mediaList,
      timestamp,
      url: igUrl
    }
  }
}
