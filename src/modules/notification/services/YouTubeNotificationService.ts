import { container } from '@sapphire/pieces'
import { AttachmentBuilder, TextChannel, WebhookClient } from 'discord.js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

import { SettingRepository } from '~/shared/repositories/settingRepository'

import { WebhookNotificationService } from '~/modules/notification/services/WebhookNotificationService'
import { YouTubeService } from '~/modules/notification/services/YouTubeService'

export class YouTubeNotificationService {
  private static shortLogoBufferPromise: Promise<Buffer> | null = null

  private static async getShortLogoBuffer(): Promise<Buffer> {
    if (!this.shortLogoBufferPromise) {
      const logoPath = resolve(process.cwd(), 'data/images/short-logo.png')
      this.shortLogoBufferPromise = readFile(logoPath)
    }

    return this.shortLogoBufferPromise
  }

  private static async addShortLogo(buffer: Buffer): Promise<Buffer> {
    const metadata = await sharp(buffer).metadata()
    if (!metadata.width || !metadata.height) return buffer

    const width = metadata.width
    const height = metadata.height
    const padding = Math.max(2, Math.round(width * 0.03))
    const logoWidth = Math.min(300, Math.max(75, Math.round(width * 0.3)))

    const shortLogoBuffer = await this.getShortLogoBuffer()
    const resizedLogoBuffer = await sharp(shortLogoBuffer)
      .resize({ width: logoWidth, fit: 'inside' })
      .png()
      .toBuffer()

    const resizedLogoMetadata = await sharp(resizedLogoBuffer).metadata()
    const resizedLogoHeight = resizedLogoMetadata.height ?? logoWidth

    const left = padding
    const top = Math.max(0, Math.min(padding, height - resizedLogoHeight))

    const result = await sharp(buffer)
      .composite([
        {
          input: resizedLogoBuffer,
          left,
          top
        }
      ])
      .jpeg({ quality: 95 })
      .toBuffer()

    return Buffer.from(result)
  }

  /**
   * Detects if a video is a YouTube Short using the redirect trick.
   * Accessing /shorts/{id} for a Short → 200 (YouTube serves it there).
   * Accessing /shorts/{id} for a regular video → 3xx (redirected away to /watch).
   */
  private static async isShort(videoId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://www.youtube.com/'
        }
      })
      // 200 = YouTube serves it at /shorts/ → IS a Short
      // 3xx = YouTube redirects away to /watch → NOT a Short
      const result = res.status === 200
      container.logger.info(
        `[YouTubeNotificationService] isShort(${videoId}) → HTTP ${res.status} → ${result}`
      )
      return result
    } catch {
      return false
    }
  }

  /**
   * Automatically trims exact homogeneous colored margins (like black bars) from thumbnails.
   * Useful for letterboxed 4:3 videos or ultra-wide padding without blurred backgrounds.
   */
  private static async trimBlackBars(buffer: Buffer): Promise<Buffer> {
    const result = await sharp(buffer)
      .trim({
        threshold: 15 // Tolerance for compression artifacts
      })
      .jpeg({ quality: 100 })
      .toBuffer()

    return Buffer.from(result)
  }

  /**
   * Crops a landscape (16:9) thumbnail buffer to portrait (9:16) from center.
   * Used to remove black bars from YouTube Shorts thumbnails.
   */
  private static async cropToShortRatio(buffer: Buffer): Promise<Buffer> {
    const metadata = await sharp(buffer).metadata()
    const width = metadata.width!
    const height = metadata.height!

    // Target width for 9:16 crop from a 16:9 source
    const targetWidth = Math.round(height * (9 / 16))
    const left = Math.round((width - targetWidth) / 2)

    const result = await sharp(buffer)
      .extract({ left, top: 0, width: targetWidth, height })
      .jpeg({ quality: 95 })
      .toBuffer()

    return Buffer.from(result)
  }

  /**
   * Processes a YouTube URL, fetches info, translates title, and sends notification.
   * @param guildId - The ID of the guild where the notification should be posted.
   * @param videoUrl - The YouTube video URL.
   * @param overrideTitle - Optional title override (e.g. translated title).
   * @returns A boolean indicating whether the process was successful.
   */
  public static async processAndNotify(
    guildId: string,
    videoUrl: string,
    overrideTitle?: string
  ): Promise<boolean> {
    const guildConfig = await SettingRepository.find(guildId)
    if (!guildConfig || !guildConfig.snsYouTubePostChannelId) {
      return false
    }

    const videoId = YouTubeService.extractVideoId(videoUrl)
    if (!videoId) return false

    try {
      // 1. Fetch video info
      const videoInfo = await YouTubeService.getVideoInfo(videoUrl)
      if (!videoInfo) return false

      // 2. Use title (prefer override if provided), strip hashtags
      const title = (overrideTitle || videoInfo.snippet.title)
        .replace(/#\S+/g, '')
        .trim()
      container.logger.info(
        `[YouTubeNotificationService] Title to use: "${title}"`
      )

      // 3. Prepare notification channel
      const guild = await container.client.guilds.fetch(guildId)
      const postChannel = (await guild.channels.fetch(
        guildConfig.snsYouTubePostChannelId
      )) as TextChannel

      if (!postChannel || !postChannel.isTextBased()) return false

      // 4. Handle Webhook and Avatar (auto-create if not found)
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

      // 5. Build content
      const webhookClient = new WebhookClient({
        id: webhook.id,
        token: webhook.token!
      })

      const isLive =
        videoInfo.snippet.liveBroadcastContent === 'live' &&
        !!videoInfo.liveStreamingDetails?.actualStartTime &&
        !videoInfo.liveStreamingDetails?.actualEndTime

      const isUpcoming = videoInfo.snippet.liveBroadcastContent === 'upcoming'

      const prefix = isLive
        ? '🔴 LIVE: '
        : isUpcoming
          ? '🔵 SẮP LIVE: '
          : '🔵 MỚI: '
      const contentTitle = title ? `\`\`\`${prefix}${title}\`\`\`` : ''

      // 6. Detect Short & fetch thumbnail
      const thumbnailUrl =
        videoInfo.snippet.thumbnails.maxres?.url ||
        videoInfo.snippet.thumbnails.high?.url ||
        videoInfo.snippet.thumbnails.medium?.url ||
        videoInfo.snippet.thumbnails.default?.url

      // Run Short detection and thumbnail fetch in parallel
      const [short, thumbnailRes] = await Promise.all([
        this.isShort(videoId),
        thumbnailUrl ? fetch(thumbnailUrl) : Promise.resolve(null)
      ])

      const files: AttachmentBuilder[] = []
      if (thumbnailRes?.ok) {
        try {
          const rawBuffer = Buffer.from(await thumbnailRes.arrayBuffer())

          // Crop strictly for Shorts to remove blurred pillars.
          // For standard videos, trim any homogeneous black letterboxing.
          const finalBuffer = short
            ? await this.addShortLogo(await this.cropToShortRatio(rawBuffer))
            : await this.trimBlackBars(rawBuffer)

          files.push(
            new AttachmentBuilder(finalBuffer, { name: 'thumbnail.jpg' })
          )
        } catch (e) {
          container.logger.warn(
            '[YouTubeNotificationService] Failed to process thumbnail:',
            e
          )
        }
      }

      await WebhookNotificationService.send({
        webhookClient,
        title: contentTitle,
        sourceUrl: `https://youtu.be/${videoId}`,
        username: channelTitle,
        avatarURL: avatarUrl || undefined,
        roleId: guildConfig.snsYouTubeRoleId,
        files,
        linkLabel: 'Xem trên YouTube'
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
