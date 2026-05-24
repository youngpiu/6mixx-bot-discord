import { container } from '@sapphire/pieces'
import { CohereClientV2 } from 'cohere-ai'

import { env } from '~/shared/config/env'

export class CohereService {
  private static readonly client = new CohereClientV2({
    token: env.COHERE_API_KEY
  })

  public static async translateToVietnamese(text: string): Promise<string> {
    const response = await this.client.chat({
      model: env.COHERE_CHAT_MODEL,

      temperature: 0,
      seed: 1,

      frequencyPenalty: 0.1,
      presencePenalty: 0,

      k: 0,
      p: 0.75,
      messages: [
        {
          role: 'system',
          content: [
            'Bạn là hệ thống dịch và chuẩn hoá tiêu đề YouTube về K-pop, đặc biệt là nội dung liên quan đến NMIXX.',
            '',
            'Mục tiêu:',
            '- Dịch tiêu đề sang tiếng Việt tự nhiên.',
            '- Giữ nguyên tối đa nội dung và phong cách tiêu đề gốc.',
            '- Chỉ trả về đúng một dòng kết quả cuối cùng.',
            '',
            '# Thành viên NMIXX',
            '- Lily',
            '- Haewon',
            '- Sullyoon',
            '- Bae',
            '- Jiwoo',
            '- Kyujin',
            '',
            '# Mapping tên tiếng Hàn',
            '- 릴리 -> Lily',
            '- 해원 -> Haewon',
            '- 설윤 -> Sullyoon',
            '- 배이 -> Bae',
            '- 지우 -> Jiwoo',
            '- 규진 -> Kyujin',
            '',
            '# Quy tắc',
            '- Nếu tiêu đề đã là tiếng Việt thì giữ nguyên hoàn toàn.',
            '- Nếu tiêu đề không phải tiếng Việt thì dịch sang tiếng Việt tự nhiên.',
            '- KHÔNG BAO GIỜ dịch tên bài hát, album, showcase, concert, tour hoặc nội dung âm nhạc.',
            '- Nếu không chắc một cụm có phải tên bài hát hoặc album hay không thì ưu tiên giữ nguyên.',
            '- Giữ nguyên các cụm tiếng Anh viết hoa kiểu title case vì chúng thường là tên bài hát.',
            '- Giữ nguyên toàn bộ tên nghệ sĩ, nhóm nhạc, fandom và tên thành viên.',
            '- Nếu gặp tên tiếng Hàn của thành viên NMIXX thì đổi sang stage name tương ứng.',
            '- Không dịch các thuật ngữ K-pop phổ biến như: fancam, comeback, spoiler, challenge, live clip, relay dance, ending fairy, teaser, behind, vlog.',
            '- Giữ nguyên emoji, ㅋㅋ, ㅠㅠ và các ký tự cảm xúc.',
            '- Giữ nguyên các ký hiệu như [], (), :, |, # nếu chúng thuộc tiêu đề gốc.',
            '- Không thêm giải thích, ghi chú hoặc nội dung phụ.',
            '- Không tạo nhiều phiên bản kết quả.',
            '',
            '# Ví dụ',
            '- "NMIXX Love Me Like This fancam" -> "NMIXX Love Me Like This fancam"',
            '- "설윤 DASH 직캠" -> "Sullyoon DASH fancam"',
            '- "NMIXX See that? MV Reaction" -> "Reaction MV NMIXX See that?"',
            '- "해원이 갑자기 빵 터진 이유ㅋㅋ" -> "Lý do Haewon đột nhiên bật cườiㅋㅋ"'
          ].join('\n')
        },
        {
          role: 'user',
          content: text
        }
      ]
    })

    const content = response.message.content ?? []

    const translated = content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('')
      .trim()

    if (!translated) {
      container.logger.warn(
        '[CohereService] Empty translation response, falling back to original text.'
      )

      return text
    }

    return translated
  }
}
