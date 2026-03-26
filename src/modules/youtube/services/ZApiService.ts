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

## CRITICAL PRESERVATION RULES (STRICT):
1. DO NOT modify, remove, normalize, or reinterpret any emoji, symbol, or special character.
   Example: "5️⃣☀️1️⃣" must remain EXACTLY "5️⃣☀️1️⃣" (never convert to "51" or anything else).
2. DO NOT add any characters that do not exist in the original string.
   - No "-", "|", ":", ",", "." or any separator.
3. DO NOT remove any existing characters.
4. DO NOT reorder any part of the original string.
   - Keep the exact original sequence of tokens.

## Translation principles:
5. Output language is Vietnamese only.
6. Translate ALL Korean (Hangul) into Vietnamese — no Korean remains.
7. Keep English words, brand names, and international terms unchanged.
8. Idol-related words must be translated naturally:
   - 콘서트 → Concert
   - 대기실 → Phòng Chờ
   - 비하인드 → Hậu Trường
   - 브이로그 → Vlog
9. Capitalize the first letter of every word in Vietnamese output.
10. Preserve spacing EXACTLY as original unless translating Korean words.

## Output format (STRICT):
- Output ONLY the translated title
- NO explanation
- NO extra characters
- NO added separators
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
