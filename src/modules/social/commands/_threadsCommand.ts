import { ChatInputCommandInteraction } from 'discord.js'

import { SocialMessageService } from '~/modules/social/services/socialMessageService'
import { ThreadsService } from '~/modules/social/services/threadsService'

export class ThreadsCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const url = interaction.options.getString('url', true)
    const showCaption = interaction.options.getBoolean('caption') ?? false
    const spoiler = interaction.options.getBoolean('spoiler') ?? false

    const threadsData = await ThreadsService.fetchThreadsData(url)

    await SocialMessageService.sendSocialPost(
      interaction,
      {
        platform: 'threads',
        username: threadsData.username,
        authorUrl: `https://www.threads.net/@${threadsData.username}`,
        postUrl: threadsData.url,
        caption: threadsData.caption,
        media: threadsData.media
      },
      {
        spoiler,
        showCaption
      }
    )
  }
}
