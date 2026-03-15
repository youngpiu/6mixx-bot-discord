import {
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  ForumChannel,
  Guild,
  MessageFlags,
  ThreadChannel
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { SettingRepository } from '~/shared/repositories/settingRepository'

import { TwitterService } from '~/modules/twitter/services/twitterService'

export class NmixxForumService {
  /**
   * Processes a tweet URL and posts images to the appropriate thread in a forum channel.
   */
  public static async postToForum(options: {
    guild: Guild
    url: string
    members: readonly string[] // List of member names
    isOtp: boolean
  }) {
    const { guild, url, members, isOtp } = options

    // 1. Get Guild Config
    const config = await SettingRepository.find(guild.id)
    const forumId = isOtp
      ? config?.nmixxOtpForumChannelId
      : config?.nmixxSingleForumChannelId

    if (!forumId) {
      throw new NormalError(
        `Kênh Forum ${isOtp ? 'OTP' : 'đơn'} chưa được cấu hình. Vui lòng liên hệ Admin.`
      )
    }

    const forum = await guild.channels.fetch(forumId)
    if (!forum || forum.type !== ChannelType.GuildForum) {
      throw new NormalError('Không tìm thấy kênh Forum cấu hình hợp lệ.')
    }

    // 2. Extract Twitter Data
    const tweetId = TwitterService.extractTweetIdFromUrl(url)
    if (!tweetId) {
      throw new NormalError('Đường link Twitter không hợp lệ.')
    }

    const tweetData = await TwitterService.fetchTweetData(tweetId)
    if (tweetData.media.length === 0) {
      throw new NormalError('Bài viết không chứa ảnh hoặc video.')
    }

    // 3. Determine Thread Name
    // For OTP, sort members alphabetically and join with ' x '
    const threadName = isOtp
      ? [...members].sort().join(' x ')
      : members[0] || 'NMIXX'

    // 4. Find or Create Thread
    let thread = await this.findThread(forum, threadName)

    if (!thread) {
      thread = await forum.threads.create({
        name: threadName,
        message: {
          content: `Tiểu sử ảnh: **${threadName}**`
        }
      })
    }

    // 5. Post Media to Thread
    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**[@${tweetData.screenName}](https://x.com/${tweetData.screenName})**`
        )
      )
      .addMediaGalleryComponents((gallery) => {
        tweetData.media.forEach((m) => {
          gallery.addItems((item) => item.setURL(m.url))
        })
        return gallery
      })
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setLabel('Xem trên X')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://x.com/${tweetData.screenName}/status/${tweetId}`)
        )
      )

    // Note: Since we are using ComponentsV2, we need to handle the send properly.
    // ThreadChannel.send works with standard discord.js.
    // To use ComponentsV2 features, we rely on the bot's custom send if exists,
    // but here we can just use the standard send with flags if supported.
    await thread.send({
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    })

    return thread
  }

  private static async findThread(
    forum: ForumChannel,
    name: string
  ): Promise<ThreadChannel | null> {
    // Search in active threads first
    const activeThreads = await forum.threads.fetchActive()
    let thread = activeThreads.threads.find((t) => t.name === name)

    if (!thread) {
      // Search in archived threads
      const archivedThreads = await forum.threads.fetchArchived()
      thread = archivedThreads.threads.find((t) => t.name === name)
    }

    return thread || null
  }
}
