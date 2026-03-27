import { container } from '@sapphire/pieces'
import { TextChannel, WebhookClient, roleMention } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'

import { YouTubeService } from '~/modules/youtube/services/YouTubeService'

export class YouTubeNotificationService {
  /**
   * Processes a YouTube URL, fetches info, translates title, and sends notification.
   * @param guildId - The ID of the guild where the notification should be posted.
   * @param videoUrl - The YouTube video URL.
   * @returns A boolean indicating whether the process was successful.
   */
  public static async processAndNotify(
    guildId: string,
    videoUrl: string,
    overrideTitle?: string
  ): Promise<boolean> {
    const guildConfig = await SettingRepository.find(guildId)
    if (!guildConfig || !guildConfig.youtubeNotificationPostChannelId) {
      return false
    }

    const videoId = YouTubeService.extractVideoId(videoUrl)
    if (!videoId) return false

    try {
      // 1. Fetch video info
      const videoInfo = await YouTubeService.getVideoInfo(videoUrl)
      if (!videoInfo) return false

      // 2. Use title (prefer override if provided)
      const title = overrideTitle || videoInfo.snippet.title
      container.logger.info(
        `[YouTubeNotificationService] Title to use: "${title}"`
      )

      // 3. Prepare notification
      const guild = await container.client.guilds.fetch(guildId)
      const postChannel = (await guild.channels.fetch(
        guildConfig.youtubeNotificationPostChannelId
      )) as TextChannel

      if (!postChannel || !postChannel.isTextBased()) return false

      const rolePing = guildConfig.youtubeNotificationRoleId
        ? `${roleMention(guildConfig.youtubeNotificationRoleId)} `
        : ''

      // 4. Handle Webhook and Avatar
      const webhooks = await postChannel.fetchWebhooks()
      const channelTitle = videoInfo.snippet.channelTitle
      let webhook = webhooks.find((wh) => wh.name === channelTitle)
      let avatarUrl = webhook?.avatarURL()

      if (!webhook) {
        container.logger.info(
          `[YouTubeNotificationService] Creating new webhook for channel: "${channelTitle}"`
        )
        const channelInfo = await YouTubeService.getChannelInfo(
          videoInfo.snippet.channelId
        )
        avatarUrl =
          channelInfo?.snippet.thumbnails.high?.url ||
          channelInfo?.snippet.thumbnails.medium?.url ||
          channelInfo?.snippet.thumbnails.default?.url

        webhook = await postChannel.createWebhook({
          name: channelTitle,
          avatar: avatarUrl || undefined
        })
      }

      // 5. Send via Webhook with Embed
      const webhookClient = new WebhookClient({
        id: webhook.id,
        token: webhook.token!
      })

      const isLive = videoInfo.snippet.liveBroadcastContent === 'live'
      const videoThumbnail =
        videoInfo.snippet.thumbnails.maxres?.url ||
        videoInfo.snippet.thumbnails.high?.url ||
        videoInfo.snippet.thumbnails.medium?.url ||
        videoInfo.snippet.thumbnails.default?.url

      const content = `\`\`\`${isLive ? '🔴 LIVE: ' : ''}${title.trim()}\`\`\`\n${rolePing}\n`

      await webhookClient.send({
        content: content || undefined,
        embeds: [
          {
            author: {
              name: channelTitle,
              icon_url: avatarUrl || undefined,
              url: `https://www.youtube.com/channel/${videoInfo.snippet.channelId}`
            },
            description: `**[${title}](https://youtu.be/${videoId})**`,
            image: {
              url: videoThumbnail || ''
            },
            color: 0xff0000
          }
        ]
      })

      return true
    } catch (error) {
      container.logger.error(
        '[YouTubeNotificationService] Error processing YouTube notification:',
        error
      )
      return false
    }
  }
}
