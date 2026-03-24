import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { SocialMessageService } from '~/modules/social/services/socialMessageService'
import { TikTokService } from '~/modules/social/services/tiktokService'

export class TikTokCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const url = interaction.options.getString('url', true)
    const showCaption = interaction.options.getBoolean('caption') ?? false
    const spoiler = interaction.options.getBoolean('spoiler') ?? false
    const showStats = interaction.options.getBoolean('stats') ?? false

    const videoId = await TikTokService.extractVideoIdFromUrl(url)
    if (!videoId) {
      throw new NormalError('Đường link hoặc ID TikTok không hợp lệ.')
    }

    try {
      const tiktokData = await TikTokService.fetchTikTokData(videoId)

      await SocialMessageService.sendSocialPost(
        interaction,
        {
          platform: 'tiktok',
          username: tiktokData.author.nickname,
          authorUrl: `https://www.tiktok.com/@${tiktokData.author.unique_id}`,
          postUrl: `https://www.tiktok.com/@${tiktokData.author.unique_id}/video/${videoId}`,
          caption: tiktokData.title,
          timestamp: tiktokData.create_time,
          media: tiktokData.play
            ? [{ type: 'video', url: tiktokData.play }]
            : [],
          stats: [
            { label: 'Lượt xem', value: tiktokData.play_count },
            { label: 'Lượt thích', value: tiktokData.digg_count },
            { label: 'Bình luận', value: tiktokData.comment_count },
            { label: 'Chia sẻ', value: tiktokData.share_count },
            { label: 'Lượt lưu', value: tiktokData.collect_count }
          ]
        },
        {
          spoiler,
          showCaption: showCaption || !tiktokData.play,
          showStats
        }
      )
    } catch (e) {
      if (e instanceof NormalError) {
        throw e
      }
      throw new NormalError(
        `Đã xảy ra lỗi khi lấy thông tin TikTok này. (${(e as Error).message})`
      )
    }
  }
}
