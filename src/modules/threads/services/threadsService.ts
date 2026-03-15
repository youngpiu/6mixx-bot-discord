import { container } from '@sapphire/framework'
import * as cheerio from 'cheerio'

import { NormalError } from '~/core/errorResponse'

import { ThreadsData, ThreadsMedia } from '../types/threadsTypes'

export class ThreadsService {
  public static extractShortcode(url: string): string | null {
    const regex =
      /(?:threads\.net|threads\.com)\/(?:@[\w.]+\/post\/|post\/)([\w-]+)/
    const match = url.match(regex)
    return match ? match[1]! : null
  }

  public static async fetchThreadsData(url: string): Promise<ThreadsData> {
    const shortcode = this.extractShortcode(url)
    if (!shortcode) {
      throw new NormalError('Đường link Threads không hợp lệ.')
    }

    // Attempt to extract username from URL as a placeholder
    const urlUsernameMatch = url.match(
      /(?:threads\.net|threads\.com)\/@([\w.]+)/
    )
    let username = urlUsernameMatch ? urlUsernameMatch[1]! : 'threads_user'
    let caption = ''

    const apiUrl = 'https://savethr.com/process'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'accept-language': 'vi,en;q=0.9',
          'content-type': 'application/x-www-form-urlencoded',
          'hx-current-url': 'https://savethr.com/',
          'hx-request': 'true',
          'hx-target': 'result-container',
          'hx-trigger': 'search-form',
          origin: 'https://savethr.com',
          referer: 'https://savethr.com/',
          'sec-ch-ua':
            '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Linux"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
        },
        body: `id=${encodeURIComponent(url)}&locale=en`
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Extract username from result container
      const extractedUsername = $('.font-semibold.text-gray-900.text-sm')
        .first()
        .text()
        .trim()
        .replace('@', '')
      if (extractedUsername) username = extractedUsername

      // Extract caption from result container
      const extractedCaption = $('.mb-4 p.text-sm.text-gray-700')
        .first()
        .text()
        .trim()
      if (extractedCaption) caption = extractedCaption

      const media: ThreadsMedia[] = []

      $('.mb-4').each((_, el) => {
        const $el = $(el)
        const imgSrc = $el.find('img.w-full').attr('src')

        const directLink = $el.find('a[target="_blank"]').attr('href')
        const downloadLink = $el.find('a.download_link').attr('href')

        const finalUrl = directLink || downloadLink || imgSrc

        if (finalUrl) {
          // Better video detection: check for .mp4 or "Download MP3" button in the same container
          const isVideo =
            finalUrl.toLowerCase().includes('.mp4') ||
            $el.text().includes('Download MP3')

          media.push({
            type: isVideo ? 'video' : 'image',
            url: finalUrl,
            previewUrl: imgSrc
          })
        }
      })

      if (media.length === 0) {
        container.logger.error(
          `[ThreadsService] No media found in response for ${url}`
        )
        throw new NormalError(
          'Không tìm thấy ảnh hoặc video trong bài viết này.'
        )
      }

      return {
        shortcode,
        username,
        caption,
        media,
        url: `https://www.threads.net/post/${shortcode}`
      }
    } catch (error) {
      if (error instanceof NormalError) throw error
      container.logger.error(
        `[ThreadsService] Error fetching data for ${url}:`,
        error
      )
      throw new NormalError(
        'Đã có lỗi xảy ra khi lấy dữ liệu từ Threads. Vui lòng thử lại sau.'
      )
    }
  }
}
