import { container } from '@sapphire/pieces'
import { request } from 'undici'

import { env } from '~/shared/config/env'

export class ZApiService {
  private static readonly API_KEY = env.Z_API_KEY
  private static readonly BASE_URL =
    'https://api.z.ai/api/paas/v4/chat/completions'

  public static async translateYouTubeTitle(title: string): Promise<string> {
    try {
      const instructions = `You are a YouTube title translator for a Korean idol group called MIXX.
Your job: translate the given YouTube title from Korean into natural Vietnamese (Tiếng Việt).

## Member name mappings (always use these):
릴리 → Lily | 해원 → Haewon | 설윤 → Sullyoon | 배이 → Bae | 지우 → Jiwoo | 규진 → Kyujin

## Translation principles:
1. Output language is Vietnamese. Do NOT output in English, Chinese, or any other language.
2. Beauty/cosmetic product terms (e.g. serum, ampoule, glow, vita, skincare, routine, toner, cushion…) are international brand language — keep them in English as-is.
3. Korean idol/schedule words (e.g. 콘서트, 대기실, 비하인드, 브이로그, 일상, 루틴…) should be translated naturally into Vietnamese using their common Vietnamese equivalents used by Vietnamese fanbases. Do not transliterate these words.
4. Preserve word order from the original Korean. Do not reorder words within a segment.
5. Each "|" segment is independent — translate it as a punchy standalone phrase. Do not connect segments with "và", "với", etc.
6. Capitalize the first letter of every word in each segment (Vietnamese YouTube title style).
7. Preserve ALL emojis, hashtags, numbers, and special symbols exactly as-is.
8. Keep brand names, channel names, product names, and English words unchanged.
9. Every Hangul character must be translated — no Korean left in output.
10. Output: one translated title per line, no explanation, no extra text.
`

      const { body, statusCode } = await request(this.BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'vi-VN,vi'
        },
        body: JSON.stringify({
          model: 'glm-4.7-flash',
          messages: [
            {
              role: 'system',
              content: instructions
            },
            {
              role: 'user',
              content: title
            }
          ],
          temperature: 1.0
        })
      })

      if (statusCode !== 200) {
        const errorData = await body.text()
        container.logger.error(
          `[ZApiService] API call failed with status ${statusCode}:`,
          errorData
        )
        return title
      }

      const data = (await body.json()) as {
        choices: { message: { content: string } }[]
      }
      container.logger.info(data)

      return data.choices[0]?.message.content.trim() || title
    } catch (error) {
      container.logger.error(
        '[ZApiService] Exception during translation:',
        error
      )
      return title
    }
  }
}
