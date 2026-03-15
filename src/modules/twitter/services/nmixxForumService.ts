import {
  Attachment,
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

    // 4. Find Thread (MUST EXIST)
    const thread = await this.findThread(forum, threadName)

    if (!thread) {
      throw new NormalError(
        `Bộ sưu tập **${threadName}** chưa được khởi tạo. Vui lòng nhấn nút **Tạo bộ sưu tập** trước.`
      )
    }

    // 5. Post Media to Thread
    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**[@${tweetData.screenName}](https://x.com/${tweetData.screenName})** - <t:${tweetData.timestamp}:d>`
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

    await thread.send({
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    })

    return thread
  }

  /**
   * Creates a new collection (thread) in the forum channel.
   */
  public static async createCollection(options: {
    guild: Guild
    members: readonly string[]
    thumbnail: Attachment
  }) {
    const { guild, members, thumbnail } = options
    const isOtp = members.length > 1

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

    // 2. Determine Thread Name
    const threadName = isOtp
      ? [...members].sort().join(' x ')
      : members[0] || 'NMIXX'

    // 3. Check if already exists
    const existingThread = await this.findThread(forum, threadName)
    if (existingThread) {
      throw new NormalError(`Bộ sưu tập **${threadName}** đã tồn tại.`)
    }

    // 4. Create Thread with Thumbnail
    const thread = await forum.threads.create({
      name: threadName,
      message: {
        files: [thumbnail]
      }
    })

    return thread
  }

  /**
   * Processes manual file uploads and posts to the appropriate thread.
   */
  public static async postManualToForum(options: {
    guild: Guild
    user: string
    date?: string
    attachments: Attachment[]
    members: readonly string[]
    isOtp: boolean
  }) {
    const { guild, user, date, attachments, members, isOtp } = options

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

    // 2. Determine Thread Name
    const threadName = isOtp
      ? [...members].sort().join(' x ')
      : members[0] || 'NMIXX'

    // 3. Find Thread (MUST EXIST)
    const thread = await this.findThread(forum, threadName)

    if (!thread) {
      throw new NormalError(
        `Bộ sưu tập **${threadName}** chưa được khởi tạo. Vui lòng nhấn nút **Tạo bộ sưu tập** trước.`
      )
    }

    // 4. Post Media to Thread
    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) => {
        let displayContent = `**Người đăng**: ${user}`

        // Try to extract username if it's a URL or @username
        const usernameMatch =
          user.match(/(?:x|twitter)\.com\/(\w+)/) || user.match(/@?(\w+)/)
        if (usernameMatch && usernameMatch[1]) {
          const screenName = usernameMatch[1]
          displayContent = `**[@${screenName}](https://x.com/${screenName})**`

          if (date) {
            const parts = date.split(/[./]/)
            const day = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10) - 1
            const year = parseInt(parts[2], 10)
            const parsedDate = new Date(year, month, day, 12, 0, 0)
            if (!isNaN(parsedDate.getTime())) {
              const timestamp = Math.floor(parsedDate.getTime() / 1000)
              displayContent += ` - <t:${timestamp}:d>`
            }
          }
        }

        return text.setContent(displayContent)
      })
      .addMediaGalleryComponents((gallery) => {
        attachments.forEach((a) => {
          gallery.addItems((item) => item.setURL(a.url))
        })
        return gallery
      })

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
