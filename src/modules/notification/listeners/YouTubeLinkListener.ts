import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Message } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'

import { YouTubeNotificationService } from '~/modules/notification/services/YouTubeNotificationService'

@ApplyOptions<Listener.Options>({
  event: 'messageCreate'
})
export class YouTubeLinkListener extends Listener {
  public async run(message: Message) {
    if (!message.guild || message.author.id === this.container.client.user?.id)
      return

    const guildConfig = await SettingRepository.find(message.guild.id)
    if (
      !guildConfig ||
      !guildConfig.youtubeNotificationListenChannelId ||
      !guildConfig.youtubeNotificationPostChannelId
    ) {
      return
    }

    if (message.channel.id !== guildConfig.youtubeNotificationListenChannelId) {
      return
    }

    const content = message.content.trim()

    // Required patterns: yt: link, YT: link, YOUTUBE: link, youtube: link, yt link, youtube link
    const triggerRegex = /^(?:yt|youtube)(?::\s*|\s+)(https?:\/\/\S+)/i
    const triggerMatch = content.match(triggerRegex)

    if (!triggerMatch) return

    // Role restriction check - bypass for other bots
    if (
      !message.author.bot &&
      guildConfig.youtubeNotificationAllowedRoleIds.length > 0 &&
      (!message.member ||
        !message.member.roles.cache.hasAny(
          ...guildConfig.youtubeNotificationAllowedRoleIds
        ))
    ) {
      return
    }

    const videoUrl = triggerMatch[1]
    await YouTubeNotificationService.processAndNotify(
      message.guild.id,
      videoUrl
    )
  }
}
