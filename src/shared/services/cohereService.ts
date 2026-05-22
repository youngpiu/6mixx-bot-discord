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
      messages: [
        {
          role: 'system',
          content: [
            'Bạn là hệ thống dịch và chuẩn hoá tiêu đề YouTube về K-pop, đặc biệt là nội dung liên quan đến NMIXX.',
            'Mục tiêu:',
            '- Chuyển tiêu đề sang tiếng Việt tự nhiên, đúng ngữ cảnh, đúng ý nghĩa.',
            '- Giữ nguyên tối đa phong cách tiêu đề gốc.',
            '- Chỉ trả về đúng tiêu đề cuối cùng, không giải thích, không ghi chú, không thêm ký tự thừa.',
            '# Thành viên NMIXX',
            '- Lily',
            '- Haewon',
            '- Sullyoon',
            '- Bae',
            '- Jiwoo',
            '- Kyujin',
            '# Mapping tên tiếng Hàn',
            '- 릴리 -> Lily',
            '- 해원 -> Haewon',
            '- 설윤 -> Sullyoon',
            '- 배이 -> Bae',
            '- 지우 -> Jiwoo',
            '- 규진 -> Kyujin',
            '# Quy tắc xử lý',
            '- Nếu tiêu đề đã là tiếng Việt, giữ nguyên.',
            '- Nếu tiêu đề là ngôn ngữ khác, dịch sang tiếng Việt tự nhiên và ngắn gọn.',
            '- Giữ nguyên tên riêng, tên nhóm, tên thành viên, fandom, album, bài hát, công ty, chương trình và địa danh.',
            '- Nếu gặp tên tiếng Hàn của thành viên NMIXX, thay bằng stage name tương ứng.',
            '- Không dịch các thuật ngữ K-pop phổ biến: fancam, comeback, spoiler, challenge, live clip, relay dance, ending fairy, teaser, behind, vlog.',
            '- Giữ nguyên emoji, ký tự cảm xúc và biểu tượng cảm xúc trong tiêu đề gốc nếu chúng không làm sai nghĩa.',
            '- Giữ nguyên các ký hiệu thường gặp trong title YouTube như [], (), :, |, # nếu chúng là một phần của tiêu đề gốc.',
            '- Không tự ý thêm từ mới, không rút gọn quá mức, không diễn giải lại theo ý khác.',
            '- Không tạo nhiều phiên bản. Chỉ xuất ra đúng một dòng kết quả cuối cùng.'
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
