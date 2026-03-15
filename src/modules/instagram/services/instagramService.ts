import { container } from '@sapphire/framework'
import * as cheerio from 'cheerio'

import { InstagramMedia, InstagramPostData } from '../types/instagramTypes'

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
    // Miso's logic: pk >> 23n (actually it depends on the ID version)
    // But sticking to Miso patterns:
    const timestampMs = pk >> 23n
    const timestamp = Number(timestampMs) / 1000
    return Math.floor(igEpoch + timestamp)
  }

  public static extractShortcode(url: string): string | null {
    const regex = /(?:\/p\/|\/reel\/|\/reels\/|\/tv\/)([A-Za-z0-9_-]+)/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  public static async fetchInstagramData(
    shortcode: string
  ): Promise<InstagramPostData> {
    const igUrl = `https://www.instagram.com/p/${shortcode}/`
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`

    let username = 'unknown'
    let caption = ''
    const media: InstagramMedia[] = []
    let timestamp: number | undefined

    // 1. Try to get metadata from direct Instagram embed page (Miso style)
    try {
      const resp = await fetch(embedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })
      if (resp.ok) {
        const html = await resp.text()

        // Extract username
        const usernameMatch = html.match(
          /<span class="UsernameText">(.*?)<\/span>/
        )
        if (usernameMatch) username = usernameMatch[1]!.trim()

        // Extract caption
        const captionMatch = html.match(
          /<div class="Caption">(.*?)(?:<div class="CaptionComments">|<\/div>)/s
        )
        if (captionMatch) {
          let extractedCaption = captionMatch[1]!
          extractedCaption = extractedCaption.replace(
            /<a class="CaptionUsername".*?<\/a><br \/><br \/>/,
            ''
          )
          extractedCaption = extractedCaption.replace(/<a[^>]*?>#.*?<\/a>/g, '')
          extractedCaption = extractedCaption.replace(/<br \/>/g, '\n')
          caption = extractedCaption.replace(/<[^>]*>?/gm, '').trim()
        }
      }
    } catch {
      // Ssssh...
    }

    // 2. Fallback to fixers for media and stats
    const fixers = [
      `https://uuinstagram.com/p/${shortcode}/`,
      `https://gginstagram.com/p/${shortcode}/`,
      `https://fxig.seria.moe/p/${shortcode}/`,
      `https://www.ddinstagram.com/p/${shortcode}/`,
      `https://d.ddinstagram.com/p/${shortcode}/`,
      `https://kkinstagram.com/p/${shortcode}/`,
      `https://instagramez.com/p/${shortcode}/`,
      `https://toinstagram.com/p/${shortcode}/`,
      `https://vxtagram.com/p/${shortcode}/`
    ]

    for (const fixerUrl of fixers) {
      if (media.length > 0 && username !== 'unknown') break

      try {
        const response = await fetch(fixerUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'
          }
        })

        if (response.ok) {
          const html = await response.text()
          const $ = cheerio.load(html)
          const fixerOrigin = new URL(fixerUrl).origin

          if (username === 'unknown') {
            username =
              $('meta[name="twitter:title"]')
                .attr('content')
                ?.replace('@', '') || username
          }
          if (!caption) {
            caption = $('meta[property="og:description"]').attr('content') || ''
          }

          if (media.length === 0) {
            const videoUrl = $('meta[property="og:video"]').attr('content')
            const imageUrl = $('meta[property="og:image"]').attr('content')

            const normalizeUrl = (url: string) =>
              url.startsWith('/') ? `${fixerOrigin}${url}` : url

            if (videoUrl) {
              media.push({ type: 'video', url: normalizeUrl(videoUrl) })
            } else if (imageUrl) {
              media.push({ type: 'image', url: normalizeUrl(imageUrl) })
            }
          }

          container.logger.info(
            `[InstagramService] Successfully fetched data from ${fixerUrl} for ${shortcode}`
          )
        }
      } catch {
        // Continue
      }
    }

    // Calculate timestamp as fallback
    try {
      const id = this.shortcodeToId(shortcode)
      timestamp = this.pkToTimestamp(id)
    } catch {
      // Ignored
    }

    if (username === 'unknown' && media.length === 0) {
      throw new Error(
        'Không thể lấy dữ liệu từ Instagram. Vui lòng thử lại sau.'
      )
    }

    return {
      shortcode,
      username,
      caption,
      media,
      timestamp,
      url: igUrl
    }
  }
}
