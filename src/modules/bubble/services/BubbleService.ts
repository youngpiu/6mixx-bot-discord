import { container } from '@sapphire/pieces'
import {
  AttachmentBuilder,
  ChannelType,
  type Guild,
  type TextChannel,
  WebhookClient
} from 'discord.js'
import { extname } from 'node:path'

import { env } from '~/shared/config/env'
import { MEMBER } from '~/shared/constants/name'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { CacheService } from '~/shared/services/cacheService'
import { normalizeMultilineText } from '~/shared/utils/textUtil'

import {
  type BubbleNotifyTweet,
  BubbleXNotifyService
} from '~/modules/bubble/services/BubbleXNotifyService'

type IdolKey = 'LILY' | 'HAEWON' | 'SULLYOON' | 'BAE' | 'JIWOO' | 'KYUJIN'
type BubbleSpeakerKey = IdolKey | 'NSWER'

interface BubbleTimelineTweet {
  id: string
  url?: string
  text?: string
  createdAt?: string | null
  isReply?: boolean
  isRetweet?: boolean
  authorUsername?: string
}

interface FXTwitterMediaItem {
  type: 'photo' | 'image' | 'video' | 'gif'
  id?: string
  url: string
}

interface FXTwitterMedia {
  all?: FXTwitterMediaItem[]
}

interface FXTwitterQuote {
  media?: FXTwitterMedia
}

interface FXTwitterTweet {
  id: string
  url: string
  text: string
  replying_to?: string | null
  reposted_by?: string | null
  media?: FXTwitterMedia
  quote?: FXTwitterQuote
}

interface FXTwitterResponse {
  code: number
  message: string
  tweet?: FXTwitterTweet
}

interface BubbleTextSegment {
  kind: 'text'
  speaker: BubbleSpeakerKey
  text: string
}

interface BubbleMediaSegment {
  kind: 'media'
  speaker: BubbleSpeakerKey
}

type BubbleSegment = BubbleTextSegment | BubbleMediaSegment

interface BubbleParsedPayload {
  targetIdol: IdolKey
  segments: BubbleSegment[]
}

interface BubbleGuildRouting {
  idolWebhooks: Record<IdolKey, WebhookClient>
  nswerWebhooks: Record<IdolKey, WebhookClient>
}

const IDOL_KEYS: IdolKey[] = [
  'LILY',
  'HAEWON',
  'SULLYOON',
  'BAE',
  'JIWOO',
  'KYUJIN'
]

const EMOJI_TO_SPEAKER: Record<string, BubbleSpeakerKey> = {
  '🐨': 'LILY',
  '🐻': 'HAEWON',
  '🦌': 'SULLYOON',
  '🐥': 'BAE',
  '🐶': 'JIWOO',
  '🐱': 'KYUJIN',
  '🐬': 'NSWER'
}

const IDOL_CHANNEL_NAME: Record<IdolKey, string> = {
  LILY: 'lily',
  HAEWON: 'haewon',
  SULLYOON: 'sullyoon',
  BAE: 'bae',
  JIWOO: 'jiwoo',
  KYUJIN: 'kyujin'
}

const IDOL_WEBHOOK_NAME: Record<IdolKey, string> = {
  LILY: MEMBER.LILY,
  HAEWON: MEMBER.HAEWON,
  SULLYOON: MEMBER.SULLYOON,
  BAE: MEMBER.BAE,
  JIWOO: MEMBER.JIWOO,
  KYUJIN: MEMBER.KYUJIN
}

const UI_LINES_TO_SKIP = new Set([
  'dịch bài đăng',
  'translate post',
  'hiển thị thêm',
  'show more'
])

export class BubbleService {
  private static readonly MEDIA_MARKER = '📸'
  private static readonly NSWER_WEBHOOK_NAME = 'NSWER'
  private static readonly PROCESS_KEY = (guildId: string) =>
    `bubble:last_tweet:${guildId}`
  private static readonly FX_STATUS_URL =
    'https://api.fxtwitter.com/u/status/{tweetId}'

  private static readonly MEDIA_FETCH_TIMEOUT_MS = 12_000
  private static readonly MEDIA_FETCH_RETRY = 3
  private static readonly MEDIA_FETCH_RETRY_DELAY_MS = 700

  private static get pollIntervalMinutes() {
    const value = env.BUBBLE_POLL_INTERVAL_MINUTES
    if (!Number.isFinite(value) || value <= 0) return 30
    return value
  }

  public static getPollIntervalMs() {
    return this.pollIntervalMinutes * 60 * 1000
  }

  public static async pollAndNotify() {
    const guildConfigs = await SettingRepository.findManyWithBubbleConfig()

    if (guildConfigs.length === 0) return

    const globalUsername = this.resolveGlobalUsername(guildConfigs)
    if (!globalUsername) {
      container.logger.warn(
        '[BubbleService] Bubble username is missing. Please configure /setting -> Bubble.'
      )
      return
    }

    const timeline = await this.fetchTimeline(globalUsername)
    if (timeline.length === 0) {
      container.logger.info(
        `[BubbleService] No timeline tweets found for @${globalUsername}.`
      )
      return
    }

    const sortedTimeline = [...timeline].sort((a, b) =>
      this.compareTweetIdDesc(a.id, b.id)
    )

    const fxCache = new Map<string, FXTwitterTweet | null>()

    for (const guildConfig of guildConfigs) {
      if (!guildConfig.bubbleIdolCategoryId) continue

      try {
        await this.processGuild({
          guildId: guildConfig.guildId,
          bubbleIdolCategoryId: guildConfig.bubbleIdolCategoryId,
          timeline: sortedTimeline,
          fxCache
        })
      } catch (error) {
        container.logger.error(
          `[BubbleService] Failed processing guild ${guildConfig.guildId}:`,
          error
        )
      }
    }
  }

  private static resolveGlobalUsername(
    guildConfigs: Awaited<ReturnType<typeof SettingRepository.findManyWithBubbleConfig>>
  ) {
    const latest = [...guildConfigs]
      .filter((g) => g.bubbleXUsername && g.bubbleXUsername.trim() !== '')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]

    return latest?.bubbleXUsername?.trim() || null
  }

  private static async processGuild(params: {
    guildId: string
    bubbleIdolCategoryId: string
    timeline: BubbleTimelineTweet[]
    fxCache: Map<string, FXTwitterTweet | null>
  }) {
    const { guildId, bubbleIdolCategoryId, timeline, fxCache } = params

    if (timeline.length === 0) return

    const lastProcessed = await CacheService.getRaw(this.PROCESS_KEY(guildId))
    const latestTweetId = timeline[0]!.id

    const candidateIds = this.pickCandidateTweetIds({
      timeline,
      lastProcessed
    })

    if (candidateIds.length === 0) return

    const guild = await container.client.guilds.fetch(guildId).catch(() => null)
    if (!guild) {
      container.logger.warn(`[BubbleService] Guild not found: ${guildId}`)
      return
    }

    const routing = await this.ensureGuildRouting(guild, bubbleIdolCategoryId)
    if (!routing) return

    const orderedIds = [...candidateIds].sort((a, b) =>
      this.compareTweetIdAsc(a, b)
    )

    for (const tweetId of orderedIds) {
      const fxTweet = await this.fetchFxTweet(tweetId, fxCache)
      if (!fxTweet) continue

      if (fxTweet.replying_to || fxTweet.reposted_by) {
        continue
      }

      const parsed = this.parseBubbleTweet(fxTweet.text)
      if (!parsed) continue

      await this.dispatchTweet({
        routing,
        parsed,
        fxTweet
      })
    }

    await CacheService.setRaw(this.PROCESS_KEY(guildId), latestTweetId)
  }

  private static pickCandidateTweetIds(params: {
    timeline: BubbleTimelineTweet[]
    lastProcessed: string | null
  }) {
    const { timeline, lastProcessed } = params

    if (!lastProcessed) {
      return timeline[0]?.id ? [timeline[0].id] : []
    }

    return timeline
      .map((tweet) => tweet.id)
      .filter((tweetId) => this.isTweetIdGreater(tweetId, lastProcessed))
  }

  private static async dispatchTweet(params: {
    routing: BubbleGuildRouting
    parsed: BubbleParsedPayload
    fxTweet: FXTwitterTweet
  }) {
    const { routing, parsed, fxTweet } = params
    const mediaPool = this.buildMediaPool(fxTweet)
    let mediaCursor = 0

    for (const segment of parsed.segments) {
      const webhookClient =
        segment.speaker === 'NSWER'
          ? routing.nswerWebhooks[parsed.targetIdol]
          : routing.idolWebhooks[parsed.targetIdol]

      if (segment.kind === 'text') {
        const chunks = this.splitMessage(segment.text)
        for (const chunk of chunks) {
          await webhookClient.send({ content: chunk })
        }
        continue
      }

      const media = mediaPool[mediaCursor++]
      if (!media) {
        await webhookClient.send({ content: this.MEDIA_MARKER })
        continue
      }

      const attachment = await this.fetchMediaAttachment(media.url, mediaCursor)
      if (!attachment) {
        await webhookClient.send({ content: this.MEDIA_MARKER })
        continue
      }

      await webhookClient.send({ files: [attachment] })
    }
  }

  private static splitMessage(content: string) {
    const trimmed = content.trim()
    if (trimmed.length <= 1900) return [trimmed]

    const lines = trimmed.split('\n')
    const chunks: string[] = []
    let current = ''

    for (const line of lines) {
      const candidate = current ? `${current}\n${line}` : line
      if (candidate.length <= 1900) {
        current = candidate
        continue
      }

      if (current) chunks.push(current)

      if (line.length <= 1900) {
        current = line
      } else {
        const fragments = line.match(/.{1,1900}/g) || [line]
        chunks.push(...fragments.slice(0, -1))
        current = fragments[fragments.length - 1]!
      }
    }

    if (current) chunks.push(current)
    return chunks
  }

  private static parseBubbleTweet(text: string): BubbleParsedPayload | null {
    const normalized = normalizeMultilineText(text)
    if (!normalized) return null

    const lines = normalized
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) return null

    let headerIdol: IdolKey | null = null
    if (/^\d{6}\b/.test(lines[0]!)) {
      headerIdol = this.extractFirstIdolFromLine(lines[0]!)
      lines.shift()
    }

    const segments: BubbleSegment[] = []
    let currentSpeaker: BubbleSpeakerKey | null = null

    for (const line of lines) {
      if (this.shouldSkipLine(line)) continue

      const parsedLine = this.parseSpeakerLine(line)
      if (parsedLine) {
        currentSpeaker = parsedLine.speaker
        this.appendSegments(segments, parsedLine.speaker, parsedLine.content)
        continue
      }

      if (!currentSpeaker) continue
      if (this.shouldSkipContinuationLine(line)) continue

      this.appendSegments(segments, currentSpeaker, line)
    }

    if (segments.length === 0) return null

    const firstIdolSpeaker = segments.find(
      (segment) => segment.speaker !== 'NSWER'
    )?.speaker

    const targetIdol =
      headerIdol ||
      (firstIdolSpeaker && firstIdolSpeaker !== 'NSWER'
        ? (firstIdolSpeaker as IdolKey)
        : null)

    if (!targetIdol) return null

    return {
      targetIdol,
      segments
    }
  }

  private static parseSpeakerLine(line: string) {
    const match = line.match(/^([🐨🐻🦌🐥🐶🐱🐬])\s*(.*)$/u)
    if (!match) return null

    const speaker = EMOJI_TO_SPEAKER[match[1]!]
    if (!speaker) return null

    return {
      speaker,
      content: match[2] || ''
    }
  }

  private static appendSegments(
    segments: BubbleSegment[],
    speaker: BubbleSpeakerKey,
    rawContent: string
  ) {
    const content = rawContent.trim()
    if (!content) return

    const parts = content.split(this.MEDIA_MARKER)
    parts.forEach((part, index) => {
      const textPart = part.trim()
      if (textPart) {
        this.pushTextSegment(segments, speaker, textPart)
      }

      if (index < parts.length - 1) {
        segments.push({
          kind: 'media',
          speaker
        })
      }
    })
  }

  private static pushTextSegment(
    segments: BubbleSegment[],
    speaker: BubbleSpeakerKey,
    text: string
  ) {
    const last = segments[segments.length - 1]
    if (last && last.kind === 'text' && last.speaker === speaker) {
      last.text = `${last.text}\n${text}`
      return
    }

    segments.push({
      kind: 'text',
      speaker,
      text
    })
  }

  private static shouldSkipLine(line: string) {
    const lower = line.toLowerCase()
    if (UI_LINES_TO_SKIP.has(lower)) return true
    if (line.startsWith('✍️')) return true
    if (line.startsWith('📝')) return true
    if (line.startsWith('http://') || line.startsWith('https://')) return true

    return false
  }

  private static shouldSkipContinuationLine(line: string) {
    if (this.shouldSkipLine(line)) return true

    // Skip plain media links that are often footer artifacts.
    if (line.includes('pic.x.com/') || line.includes('t.co/')) return true

    return false
  }

  private static extractFirstIdolFromLine(line: string) {
    for (const [emoji, speaker] of Object.entries(EMOJI_TO_SPEAKER)) {
      if (speaker === 'NSWER') continue
      if (line.includes(emoji)) {
        return speaker as IdolKey
      }
    }

    return null
  }

  private static buildMediaPool(tweet: FXTwitterTweet) {
    const mainMedia = tweet.media?.all || []
    const quoteMedia = tweet.quote?.media?.all || []

    const merged = [...mainMedia, ...quoteMedia]
    const deduped = new Map<string, FXTwitterMediaItem>()

    for (const media of merged) {
      if (!media?.url) continue
      if (!deduped.has(media.url)) {
        deduped.set(media.url, media)
      }
    }

    return [...deduped.values()]
  }

  private static async fetchMediaAttachment(url: string, index: number) {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      Referer: 'https://x.com/'
    }

    let lastError = ''

    for (let attempt = 1; attempt <= this.MEDIA_FETCH_RETRY; attempt++) {
      try {
        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(this.MEDIA_FETCH_TIMEOUT_MS)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const pathname = new URL(url).pathname
        const ext = extname(pathname) || '.jpg'
        const name = `bubble-media-${index}${ext}`

        return new AttachmentBuilder(Buffer.from(arrayBuffer), { name })
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        if (attempt < this.MEDIA_FETCH_RETRY) {
          await this.wait(this.MEDIA_FETCH_RETRY_DELAY_MS * attempt)
        }
      }
    }

    container.logger.warn(
      `[BubbleService] Failed to fetch media ${url}: ${lastError}`
    )
    return null
  }

  private static async fetchFxTweet(
    tweetId: string,
    cache: Map<string, FXTwitterTweet | null>
  ) {
    if (cache.has(tweetId)) {
      return cache.get(tweetId) ?? null
    }

    try {
      const endpoint = this.FX_STATUS_URL.replace('{tweetId}', tweetId)
      const response = await fetch(endpoint)
      if (!response.ok) {
        cache.set(tweetId, null)
        return null
      }

      const data = (await response.json()) as FXTwitterResponse
      const tweet = data.tweet || null
      cache.set(tweetId, tweet)
      return tweet
    } catch (error) {
      container.logger.warn(
        `[BubbleService] Failed fetching FXTwitter tweet ${tweetId}:`,
        error
      )
      cache.set(tweetId, null)
      return null
    }
  }

  private static async fetchTimeline(username: string) {
    if (!env.BUBBLE_X_AUTH_TOKEN) {
      container.logger.warn(
        '[BubbleService] Missing BUBBLE_X_AUTH_TOKEN. Bubble polling skipped.'
      )
      return [] as BubbleTimelineTweet[]
    }

    let tweets: BubbleNotifyTweet[] = []
    try {
      tweets = await BubbleXNotifyService.fetchTweetsForUsername(
        username,
        env.BUBBLE_X_AUTH_TOKEN
      )
    } catch (error) {
      container.logger.warn(
        '[BubbleService] Notification fetch failed:',
        error
      )
      return []
    }

    const mapped = tweets
      .filter((tweet) => !!tweet.id)
      .filter((tweet) => !tweet.isReply && !tweet.isRetweet)
      .map((tweet): BubbleTimelineTweet => ({
        id: String(tweet.id),
        url: tweet.url,
        text: tweet.text,
        isReply: tweet.isReply,
        isRetweet: tweet.isRetweet,
        authorUsername: tweet.authorUsername
      }))

    return mapped
  }

  private static async ensureGuildRouting(guild: Guild, categoryId: string) {
    const category = await guild.channels.fetch(categoryId)

    if (!category || category.type !== ChannelType.GuildCategory) {
      container.logger.warn(
        `[BubbleService] Invalid bubble category ${categoryId} in guild ${guild.id}`
      )
      return null
    }

    // Warm channel cache to avoid creating duplicate channels when cache is cold.
    await guild.channels.fetch()

    const idolWebhooks = {} as Record<IdolKey, WebhookClient>
    const nswerWebhooks = {} as Record<IdolKey, WebhookClient>

    for (const idolKey of IDOL_KEYS) {
      const channel = await this.ensureIdolChannel(guild, category.id, idolKey)
      if (!channel) return null

      const [idolWebhook, nswerWebhook] = await Promise.all([
        this.ensureWebhook(channel, IDOL_WEBHOOK_NAME[idolKey]),
        this.ensureWebhook(channel, this.NSWER_WEBHOOK_NAME)
      ])

      idolWebhooks[idolKey] = idolWebhook
      nswerWebhooks[idolKey] = nswerWebhook
    }

    return {
      idolWebhooks,
      nswerWebhooks
    }
  }

  private static async ensureIdolChannel(
    guild: Guild,
    categoryId: string,
    idolKey: IdolKey
  ) {
    const expectedName = IDOL_CHANNEL_NAME[idolKey]

    const existing = guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        channel.parentId === categoryId &&
        channel.name.toLowerCase() === expectedName
    )

    if (existing && existing.isTextBased()) {
      return existing as TextChannel
    }

    const created = await guild.channels.create({
      name: expectedName,
      type: ChannelType.GuildText,
      parent: categoryId
    })

    return created as TextChannel
  }

  private static async ensureWebhook(channel: TextChannel, name: string) {
    const webhooks = await channel.fetchWebhooks()
    const existing = webhooks.find(
      (webhook) => webhook.name.toLowerCase() === name.toLowerCase()
    )

    const webhook =
      existing ||
      (await channel.createWebhook({
        name
      }))

    return new WebhookClient({
      id: webhook.id,
      token: webhook.token!
    })
  }

  private static isTweetIdGreater(a: string, b: string) {
    return this.compareTweetIdAsc(a, b) > 0
  }

  private static compareTweetIdAsc(a: string, b: string) {
    try {
      const aBig = BigInt(a)
      const bBig = BigInt(b)
      if (aBig > bBig) return 1
      if (aBig < bBig) return -1
      return 0
    } catch {
      return a.localeCompare(b)
    }
  }

  private static compareTweetIdDesc(a: string, b: string) {
    return this.compareTweetIdAsc(b, a)
  }

  private static wait(ms: number) {
    return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
  }
}
