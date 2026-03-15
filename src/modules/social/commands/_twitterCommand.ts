import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { SocialMessageService } from '~/modules/social/services/socialMessageService'
import { TwitterService } from '~/modules/social/services/twitterService'

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

    await SocialMessageService.sendSocialPost(
      interaction,
      {
        platform: 'twitter',
        username: tweetData.screenName,
        authorUrl: `https://x.com/${tweetData.screenName}`,
        postUrl: `https://x.com/${tweetData.screenName}/status/${tweetId}`,
        caption: TwitterService.removeTcoLink(tweetData.text),
        timestamp: tweetData.timestamp,
        media: tweetData.media,
        stats: [
          { label: 'Trả lời', value: tweetData.replies ?? 0 },
          { label: 'Đăng lại', value: tweetData.retweets ?? 0 },
          { label: 'Lượt thích', value: tweetData.likes ?? 0 },
          { label: 'Đánh dấu', value: tweetData.bookmarks ?? 0 }
        ]
      },
      {
        spoiler,
        showCaption: showCaption || tweetData.media.length === 0,
        showStats
      }
    )
  }
}
