import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'

import { TikTokService } from '~/modules/tiktok/services/tiktokService'

export class TikTokCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const url = interaction.options.getString('url', true)
    const showCaption = interaction.options.getBoolean('caption') ?? false
    const spoiler = interaction.options.getBoolean('spoiler') ?? false
    const showStats = interaction.options.getBoolean('stats') ?? false

    const videoId = TikTokService.extractVideoIdFromUrl(url)
    if (!videoId) {
      throw new NormalError('Đường link hoặc ID TikTok không hợp lệ.')
    }

    try {
      const tiktokData = await TikTokService.fetchTikTokData(videoId)

      const container = new ContainerBuilder()
        .setAccentColor(0xff0050) // TikTok Pinkish-Red
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `${STATIC_EMOJI.TIKTOK} **[@${tiktokData.author.nickname}](https://www.tiktok.com/@${tiktokData.author.unique_id})** <t:${tiktokData.create_time}:s>`
          )
        )

      const shouldShowCaption = showCaption || !tiktokData.play

      if (showStats) {
        const statsText = [
          `-# **Lượt xem:** ${tiktokData.play_count.toLocaleString()}`,
          `-# **Lượt thích:** ${tiktokData.digg_count.toLocaleString()}`,
          `-# **Bình luận:** ${tiktokData.comment_count.toLocaleString()}`,
          `-# **Chia sẻ:** ${tiktokData.share_count.toLocaleString()}`,
          `-# **Lượt lưu:** ${tiktokData.collect_count.toLocaleString()}`
        ].join('\n')

        container
          .addSeparatorComponents((separator) => separator)
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(statsText)
          )
      }

      if (shouldShowCaption && tiktokData.title) {
        container
          .addSeparatorComponents((separator) => separator)
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`>>> ${tiktokData.title}`)
          )
      }

      if (tiktokData.play) {
        container
          .addSeparatorComponents((separator) => separator)
          .addMediaGalleryComponents((gallery) =>
            gallery.addItems((item) =>
              item.setURL(tiktokData.play).setSpoiler(spoiler)
            )
          )
      }

      container
        .addSeparatorComponents((separator) => separator)
        .addActionRowComponents((actionRow) =>
          actionRow.setComponents(
            new ButtonBuilder()
              .setLabel('Xem trên TikTok')
              .setStyle(ButtonStyle.Link)
              .setURL(
                `https://www.tiktok.com/@${tiktokData.author.unique_id}/video/${videoId}`
              )
          )
        )

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      })
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
