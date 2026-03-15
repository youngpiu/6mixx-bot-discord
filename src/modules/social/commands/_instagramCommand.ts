import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InstagramService } from '~/modules/social/services/instagramService'
import { SocialMessageService } from '~/modules/social/services/socialMessageService'

export class InstagramCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const url = interaction.options.getString('url', true)
    const showCaption = interaction.options.getBoolean('caption') ?? false
    const spoiler = interaction.options.getBoolean('spoiler') ?? false

    const shortcode = InstagramService.extractShortcode(url)
    if (!shortcode) {
      throw new NormalError('Đường link Instagram không hợp lệ.')
    }

    const igData = await InstagramService.fetchInstagramData(shortcode)

    await SocialMessageService.sendSocialPost(
      interaction,
      {
        platform: 'instagram',
        username: igData.username,
        authorUrl: `https://www.instagram.com/${igData.username}`,
        postUrl: igData.url,
        caption: igData.caption,
        timestamp: igData.timestamp,
        media: igData.media
      },
      {
        spoiler,
        showCaption
      }
    )
  }
}
