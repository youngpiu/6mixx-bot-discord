import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'

import { TwitterService } from '~/modules/twitter/services/twitterService'

export class TwitterCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const url = interaction.options.getString('url', true)
    const showCaption = interaction.options.getBoolean('caption') ?? false
    const spoiler = interaction.options.getBoolean('spoiler') ?? false
    const showStats = interaction.options.getBoolean('stats') ?? false

    const tweetId = TwitterService.extractTweetIdFromUrl(url)
    if (!tweetId) {
      throw new NormalError('Đường link X/Twitter không hợp lệ.')
    }

    const tweetData = await TwitterService.fetchTweetData(tweetId)

    const galleryItems: { url: string; spoiler: boolean }[] = []

    for (let i = 0; i < tweetData.media.length; i++) {
      const media = tweetData.media[i]!
      galleryItems.push({ url: media.url, spoiler })
    }

    const container = new ContainerBuilder().addTextDisplayComponents(
      (textDisplay) =>
        textDisplay.setContent(
          `${STATIC_EMOJI.TWITTER} **[@${tweetData.screenName}](https://x.com/${tweetData.screenName})** <t:${Math.floor(tweetData.timestamp)}:s>`
        )
    )

    if (showStats) {
      const statsText = [
        `-# **Trả lời:** ${(tweetData.replies ?? 0).toLocaleString()}`,
        `-# **Đăng lại:** ${(tweetData.retweets ?? 0).toLocaleString()}`,
        `-# **Lượt thích:** ${(tweetData.likes ?? 0).toLocaleString()}`,
        `-# **Đánh dấu:** ${(tweetData.bookmarks ?? 0).toLocaleString()}`
      ].join('\n')

      container
        .addSeparatorComponents((separator) => separator)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(statsText)
        )
    }

    const shouldShowCaption = showCaption || galleryItems.length === 0

    if (shouldShowCaption && tweetData.text) {
      const cleanedText = TwitterService.removeTcoLink(tweetData.text)
      if (cleanedText) {
        container
          .addSeparatorComponents((separator) => separator)
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`>>> ${cleanedText}`)
          )
      }
    }

    if (galleryItems.length > 0) {
      container
        .addSeparatorComponents((separator) => separator)
        .addMediaGalleryComponents((gallery) => {
          galleryItems.forEach((item) => {
            gallery.addItems((mediaItem) =>
              mediaItem.setURL(item.url).setSpoiler(item.spoiler)
            )
          })
          return gallery
        })
    }

    container
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setLabel('Xem trên X')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://x.com/${tweetData.screenName}/status/${tweetId}`)
        )
      )

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    })
  }
}
