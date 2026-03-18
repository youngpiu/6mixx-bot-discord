import { container } from '@sapphire/pieces'
import OpenAI from 'openai'

import { env } from '~/shared/config/env'

export class OpenRouterService {
  private static readonly client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: env.OPENROUTER_API_KEY
  })

  public static async translateYouTubeTitle(title: string): Promise<string> {
    try {
      const instructions = `You are a YouTube title translator specializing in Korean idol content.
Translate the following YouTube video titles from Korean to Vietnamese.

Context — MIXX members (use these mappings when names appear in titles):
- 릴리 → Lily (Lily Jin Park Morrow)
- 해원 → Haewon (Oh Hae-won)
- 설윤 → Sullyoon (Seol Yoon-ah)
- 배이 → Bae (Bae Jin-sol)
- 지우 → Jiwoo (Kim Ji-woo)
- 규진 → Kyujin (Jang Kyu-jin)

Domain context:
- Titles may contain Korean beauty/skincare copywriting language.
  Translate with natural Vietnamese beauty terminology, not literal meaning.
  Examples:
  - 촉촉하고 맑게 → "mượt mà và rạng rỡ" (NOT "ẩm ướt và trong suốt")
  - 촉촉한 → "căng ẩm", "mướt mà"
  - 맑은 피부 → "làn da rạng rỡ"
  - 글로우 → "glow", "rạng rỡ"
- Titles may contain casual/colloquial Korean expressions from idol vlogs.
  Prioritize natural, expressive Vietnamese over literal translation.

Rules:
- CRITICAL: Every Korean character (Hangul) MUST be translated or transliterated.
  Do NOT leave any Hangul in the output under any circumstance.
- If a Korean word has no direct translation, transliterate it to Latin
  (e.g., 감자탕 → Gamjatang, 브이로그 → Vlog)
- Segment structure: translate each "|" segment as an independent, punchy phrase.
  Do NOT chain segments with connectors like "và", "với", "rồi".
  BAD:  "với iRecipe và ẩm ướt và trong suốt"
  GOOD: "Mượt Mà & Rạng Rỡ Cùng iRecipe"
- Capitalization: capitalize the first letter of each word in every "|" segment,
  following Vietnamese YouTube title conventions.
  BAD:  "hậu trường quay quảng cáo iRecipe cùng Jiwoo"
  GOOD: "Hậu Trường Quay Quảng Cáo iRecipe Cùng Jiwoo"
- Preserve emojis, special characters, and decorative symbols exactly as-is
- Keep proper nouns, brand names, and channel-specific terms unchanged
  (e.g., "MIXX Log", "Day MIXX", "MIXX")
- Keep English words/phrases unchanged
- Translate naturally — match the casual, expressive tone typical of Korean vlog titles
- Each title is separated by a newline
- Output format: one translated title per line, same order as input, no extra explanation
`

      // As per user's streaming snippet
      const stream = await this.client.chat.completions.create({
        model: 'openai/gpt-oss-120b:free',
        messages: [
          {
            role: 'system' as const,
            content: instructions
          },
          {
            role: 'user' as const,
            content: title
          }
        ],
        stream: true
      })

      let translatedText = ''
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          translatedText += content
        }
      }

      return translatedText.trim() || title
    } catch (error) {
      container.logger.error(
        '[OpenRouterService] Exception during translation:',
        error
      )
      return title
    }
  }
}
