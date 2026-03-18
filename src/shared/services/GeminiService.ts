import { container } from '@sapphire/pieces'
import { request } from 'undici'

import { env } from '~/shared/config/env'

export class GeminiService {
  private static readonly API_KEY = env.GEMINI_API_KEY
  private static readonly BASE_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent'

  public static async translateYouTubeTitle(title: string): Promise<string> {
    try {
      const prompt = `
Bạn là chuyên gia dịch tiêu đề video YouTube K-pop sang tiếng Việt.

## Thông tin nhóm NMIXX

Mapping nghệ danh ↔ Hangul (nghệ danh | hangul nghệ danh | hangul tên khai sinh):
- Lily    | 릴리 | 릴리 진 박 머로우 / 박진
- Haewon  | 해원 | 오해원
- Sullyoon| 설윤 | 설윤아
- Bae     | 배이 | 배진솔 / 진솔
- Jiwoo   | 지우 | 김지우
- Kyujin  | 규진 | 장규진

## Quy tắc xử lý

**Giữ nguyên — không dịch:**
- Tên nghệ danh Latin: Lily, Haewon, Sullyoon, Bae, Jiwoo, Kyujin, NMIXX
- Tên bài hát, album, era, series, show, thương hiệu, địa điểm
- Chữ Hàn trong ngoặc đơn đi kèm tên Latin (ví dụ: NMIXX(엔믹스) → NMIXX (엔믹스))
- Thuật ngữ K-pop phổ biến: Fancam, Relay Dance, Behind, Challenge, Comeback, Debut, Teaser, Encore, Live, Reaction, Covered by, Day MIXX
- Emoji: giữ nguyên vị trí

**Dịch sang tiếng Việt:**
- Nội dung mô tả bằng tiếng Hàn → dịch nghĩa
- Tên thành viên bằng Hangul (nghệ danh hoặc tên khai sinh) → chuyển sang nghệ danh Latin
  + 진솔 / 배진솔 → Bae
  + 설윤 / 설윤아 → Sullyoon
  + 지우 / 김지우 → Jiwoo
  + 규진 / 장규진 → Kyujin
  + 해원 / 오해원 → Haewon
  + 릴리 / 박진 → Lily
- Thuật ngữ ít phổ biến: "Spot Video" → "Video Giới Thiệu", "화보 촬영 비하인드" → "Hậu Trường Chụp Ảnh Bìa"
- Số thứ tự + danh từ chung: "1ST WORLD TOUR" → "Chuyến Lưu Diễn Thế Giới Đầu Tiên"
- Tên series Hangul cố định: 릴코딩 → Lilcording

**Tiêu đề đã là tiếng Việt:**
- Trả về nguyên bản, không chỉnh sửa

## Định dạng output
- Giữ nguyên ký tự phân cách gốc: |, -, [], ()
- Giữ nguyên emoji và vị trí của chúng
- Không thêm dấu câu, giải thích, hoặc nội dung ngoài tiêu đề
- Chỉ trả về tiêu đề đã dịch

## Ví dụ

Input:  NMIXX(엔믹스) 1ST WORLD TOUR 'EPISODE 1: ZERO FRONTIER' | Spot Video
Output: NMIXX (엔믹스) Chuyến Lưu Diễn Thế Giới Đầu Tiên 'EPISODE 1: ZERO FRONTIER' | Video Giới Thiệu

Input:  모여봐요 진솔이네🏡 | 모두 솔이네 집으로 모여! TEASER
Output: Cùng Tụ Tập Nào, Nhà Bae 🏡 | Mọi Người Đến Nhà Bae Thôi! TEASER

Input:  PICK NMIXX 됐어요… 우리 화보 장인 됐어요!!!📷 | W Korea 설윤 배이 지우 화보 촬영 비하인드 | Day MIXX
Output: Chúng Tôi Đã Được PICK NMIXX… Chúng Tôi Đã Thành Cao Thủ Chụp Ảnh Rồi!!!📷 | W Korea Sullyoon Bae Jiwoo Hậu Trường Chụp Ảnh Bìa | Day MIXX

Input:  'Taylor Swift - Enchanted' Covered by NMIXX LILY | 릴코딩
Output: 'Taylor Swift - Enchanted' Được Cover Bởi NMIXX LILY | Lilcording

## Input
${title}`

      const { body } = await request(`${this.BASE_URL}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      })

      interface GeminiResponse {
        candidates?: {
          content?: {
            parts?: {
              text?: string
            }[]
          }
        }[]
      }

      const data = (await body.json()) as GeminiResponse

      container.logger.info('[GeminiService] Response:', JSON.stringify(data))

      const translatedText =
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

      return translatedText || title
    } catch (error) {
      container.logger.error(
        '[GeminiService] Exception during translation:',
        error
      )
      return title
    }
  }
}
