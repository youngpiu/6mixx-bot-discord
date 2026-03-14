import { container } from '@sapphire/pieces'
import Bottleneck from 'bottleneck'
import * as cheerio from 'cheerio'

import { env } from '~/shared/config/env'

import { LastFmCacheService } from '~/modules/lastfm/services/lastFmCacheService'

export class LastFmScraperService {
  private static readonly limiter = new Bottleneck({
    minTime: 500,
    maxConcurrent: 1
  })

  private static readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  private static async safeFetch(
    url: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': this.USER_AGENT,
            ...options.headers
          }
        })
        clearTimeout(timeout)
        return response
      } catch (error) {
        if (attempt === retries) throw error
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
    throw new Error('Fetch failed after retries')
  }

  /**
   * Performs a login to Last.fm to obtain a session cookie.
   * Based on Section 7.A of fm.md.
   */
  public static async login(): Promise<string | null> {
    const username = env.LASTFM_BOT_USERNAME
    const password = env.LASTFM_BOT_PASSWORD

    if (!username || !password) {
      container.logger.warn(
        '[LastFmScraperService] Bot credentials not configured. Scraping might be limited.'
      )
      return null
    }

    try {
      // 1. GET login page to get CSRF token
      const loginRes = await this.safeFetch('https://www.last.fm/login')
      const loginPage = await loginRes.text()

      const $ = cheerio.load(loginPage)
      const csrfToken = $('input[name="csrfmiddlewaretoken"]').val() as string

      if (!csrfToken) {
        throw new Error('Could not find CSRF token')
      }

      // 2. POST login
      const response = await this.safeFetch('https://www.last.fm/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: 'https://www.last.fm/login'
        },
        body: new URLSearchParams({
          csrfmiddlewaretoken: csrfToken,
          username_or_email: username,
          password: password,
          next: '/user/_',
          submit: ''
        }).toString(),
        redirect: 'manual'
      })

      // Extract cookies from set-cookie headers
      const setCookies = response.headers.getSetCookie()
      const sessionCookie = setCookies.join('; ')

      if (sessionCookie) {
        await LastFmCacheService.setSessionCookie(sessionCookie)
        container.logger.info(
          '[LastFmScraperService] Successfully logged in to Last.fm'
        )
        return sessionCookie
      }

      return null
    } catch (error) {
      container.logger.error('[LastFmScraperService] Login failed:', error)
      return null
    }
  }

  /**
   * Gets the stored session cookie or performs login if missing.
   */
  private static async getSessionCookie(): Promise<string | null> {
    let cookie = await LastFmCacheService.getSessionCookie()
    if (cookie) return cookie
    cookie = await this.login()
    return cookie
  }

  /**
   * Scrapes album metadata (release date).
   */
  public static async scrapeAlbumMetadata(artist: string, album: string) {
    return this.limiter.schedule(async () => {
      const url = `https://www.last.fm/music/${encodeURIComponent(artist)}/${encodeURIComponent(album)}`
      const cookie = await this.getSessionCookie()

      const res = await this.safeFetch(url, {
        headers: {
          Cookie: cookie || ''
        }
      })
      const html = await res.text()

      const $ = cheerio.load(html)
      const metadata: Record<string, string> = {}

      $('.catalogue-metadata-heading').each((i, el) => {
        const key = $(el).text().trim().replace(/:$/, '')
        const value = $(el)
          .next('.catalogue-metadata-description')
          .text()
          .trim()
        if (key && value) metadata[key] = value
      })

      return {
        releaseDate:
          metadata['Release Date'] || metadata['Ngày phát hành'] || null,
        duration: metadata['Duration'] || metadata['Thời lượng'] || null
      }
    })
  }

  /**
   * Scrapes artist HD image.
   */
  public static async scrapeArtistImage(
    artist: string
  ): Promise<string | null> {
    try {
      return await this.limiter.schedule(async () => {
        const url = `https://www.last.fm/music/${encodeURIComponent(artist)}/+images`
        const cookie = await this.getSessionCookie()

        const res = await this.safeFetch(url, {
          headers: {
            Cookie: cookie || ''
          }
        })
        const html = await res.text()

        const $ = cheerio.load(html)
        // The first image in the grid is usually the most popular one
        const imageSrc = $('.image-list-item-wrapper img').first().attr('src')

        if (imageSrc) {
          // Convert thumbnail URL to original/HD URL if possible
          return imageSrc.replace(/\/\d+s\//, '/640x640/')
        }

        return null
      })
    } catch (error) {
      container.logger.error(
        `[LastFmScraperService] Failed to scrape artist image for ${artist}:`,
        error
      )
      return null
    }
  }

  /**
   * Scrapes library items (tracks or albums) for a specific artist.
   */
  public static async scrapeArtistLibraryItems(
    username: string,
    artist: string,
    type: 'tracks' | 'albums',
    period?: string
  ) {
    return this.limiter.schedule(async () => {
      const baseUrl = `https://www.last.fm/user/${username}/library/music/${encodeURIComponent(artist)}`
      const url = `${baseUrl}/+${type}${period ? `?date_preset=${this.mapPeriodToPreset(period)}` : ''}`

      const cookie = await this.getSessionCookie()
      const res = await this.safeFetch(url, {
        headers: {
          Cookie: cookie || ''
        }
      })
      const html = await res.text()

      const $ = cheerio.load(html)
      const items: { name: string; count: number }[] = []

      $('.chartlist-row').each((i, el) => {
        if (i >= 50) return false // Limit to top 50
        const name = $(el).find('.chartlist-name').text().trim()
        const countText = $(el)
          .find('.chartlist-count-bar-value')
          .text()
          .trim()
          .split(' ')[0]
        const count = parseInt(countText.replace(/,/g, ''), 10) || 0
        if (name && count) {
          items.push({ name, count })
        }
      })

      return items
    })
  }

  private static mapPeriodToPreset(period: string): string {
    const mapping: Record<string, string> = {
      '7day': 'LAST_7_DAYS',
      '1month': 'LAST_30_DAYS',
      '3month': 'LAST_90_DAYS',
      '6month': 'LAST_180_DAYS',
      '12month': 'LAST_365_DAYS',
      overall: 'ALL'
    }
    return mapping[period] || 'ALL'
  }
}
