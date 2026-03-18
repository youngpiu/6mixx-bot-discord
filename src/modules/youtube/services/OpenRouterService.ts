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
      const instructions = `
Bạn là hệ thống dịch tiêu đề YouTube K-pop sang tiếng Việt.

# Mục tiêu
Dịch chính xác, giữ nguyên format, không thêm nội dung.

# Quy tắc bắt buộc (ưu tiên cao nhất)

1. Output:
- Chỉ 1 dòng duy nhất
- Không giải thích
- Không thêm ký tự ngoài tiêu đề

2. Giữ nguyên:
- Nghệ danh Latin: Lily, Haewon, Sullyoon, Bae, Jiwoo, Kyujin, NMIXX
- Tên bài hát, album, series, show, brand, địa điểm
- Emoji và vị trí
- Ký tự phân cách: | - [] ()
- Thuật ngữ: Fancam, Relay Dance, Behind, Challenge, Comeback, Debut, Teaser, Encore, Live, Reaction, Covered by, Day MIXX

3. Mapping tên (Hangul → Latin):
- 릴리 / 박진 → Lily
- 해원 / 오해원 → Haewon
- 설윤 / 설윤아 → Sullyoon
- 배이 / 배진솔 / 진솔 → Bae
- 지우 / 김지우 → Jiwoo
- 규진 / 장규진 → Kyujin

4. Dịch:
- Nội dung tiếng Hàn → tiếng Việt tự nhiên
- 감자탕 → canh xương heo
- 화보 촬영 비하인드 → Hậu Trường Chụp Ảnh Bìa
- Spot Video → Video Giới Thiệu
- 릴코딩 → Lilcording

5. Nếu tiêu đề đã là tiếng Việt:
→ giữ nguyên

# Output format (strict)
- Không xuống dòng
- Không dấu chấm cuối
- Không thêm text ngoài tiêu đề

# Ví dụ

Input: 모여봐요 진솔이네🏡 | 모두 솔이네 집으로 모여! TEASER
Output: Cùng Tụ Tập Nào, Nhà Bae 🏡 | Mọi Người Đến Nhà Bae Thôi! TEASER
`

      // As per user's streaming snippet
      const stream = await this.client.chat.completions.create({
        model: 'nvidia/nemotron-3-nano-30b-a3b:free',
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
