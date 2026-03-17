import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Message, TextChannel, roleMention } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'
import { GeminiService } from '~/shared/services/GeminiService'

import { YouTubeService } from '~/modules/youtube/services/YouTubeService'

@ApplyOptions<Listener.Options>({
  event: 'messageCreate'
})
export class YouTubeLinkListener extends Listener {
  public async run(message: Message) {
    if (message.author.bot || !message.guild) return

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

    // If not matching prefix + link, check if it's a raw link (if we still want to support that)
    // The user said "phải có", so I will enforce the prefix.
    if (!triggerMatch) return

    const videoUrl = triggerMatch[1]
    const videoId = YouTubeService.extractVideoId(videoUrl)
    if (!videoId) return

    try {
      // 1. Fetch video info
      const videoInfo = await YouTubeService.getVideoInfo(videoUrl)
      if (!videoInfo) return

      // 2. Translate title
      const translatedTitle = await GeminiService.translateYouTubeTitle(
        videoInfo.snippet.title
      )

      // 3. Prepare notification
      const postChannel = (await message.guild.channels.fetch(
        guildConfig.youtubeNotificationPostChannelId
      )) as TextChannel
      if (!postChannel || !postChannel.isTextBased()) return

      const rolePing = guildConfig.youtubeNotificationRoleId
        ? `${roleMention(guildConfig.youtubeNotificationRoleId)} `
        : ''
      const isLive = videoInfo.snippet.liveBroadcastContent === 'live'

      const notificationMessage = `\`\`\`${isLive ? '🔴 LIVE: ' : ''}${translatedTitle}\`\`\`\n${rolePing}\n\nhttps://youtu.be/${videoId}`

      await postChannel.send({
        content: notificationMessage
      })
    } catch (error) {
      this.container.logger.error(
        '[YouTubeLinkListener] Error processing YouTube link:',
        error
      )
    }
  }
}
