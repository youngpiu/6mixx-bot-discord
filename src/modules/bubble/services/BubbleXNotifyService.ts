import { createHash, randomInt, randomUUID } from 'node:crypto'

const DEFAULT_BEARER_TOKEN =
  'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'
const REQUEST_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const REQUEST_USER_AGENT_CH =
  '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"'
const DEFAULT_KEYWORD = 'obfiowerehiring'
const MAX_RETRIES = 3

const URL_USER_BY_SCREEN_NAME =
  'https://api.x.com/graphql/jUKA--0QkqGIFhmfRZdWrQ/UserByScreenName'
const URL_USER_TWEETS =
  'https://x.com/i/api/graphql/2ItQrd86P8C0pDU6td3Z7Q/UserTweets'

interface UserByScreenNameResponse {
  data?: {
    user?: {
      result?: {
        rest_id?: string
      }
    }
  }
}

export interface BubbleNotifyTweet {
  id: string
  text: string
  authorUsername: string
  url: string
  isReply: boolean
  isRetweet: boolean
}

type UnknownRecord = Record<string, unknown>

export class BubbleXNotifyService {
  private static state: {
    authToken: string
    csrfToken: string
    verificationKey: string
  } | null = null

  public static async fetchTweetsForUsername(
    username: string,
    authToken: string
  ): Promise<BubbleNotifyTweet[]> {
    const normalizedTarget = username.replace(/^@/, '').toLowerCase().trim()
    if (!normalizedTarget) return []

    await this.ensureAuthenticated(authToken)

    const userId = await this.fetchUserIdByScreenName(normalizedTarget)
    if (!userId) return []

    const timelineData = await this.tweetyGet(
      URL_USER_TWEETS,
      this.buildUserTweetsParams(userId)
    )

    const tweets = this.extractTweetsFromUserTimeline(
      timelineData,
      normalizedTarget
    )

    return tweets.sort((a, b) => this.compareTweetIdDesc(a.id, b.id))
  }

  private static async fetchUserIdByScreenName(username: string) {
    const response = (await this.tweetyGet(
      URL_USER_BY_SCREEN_NAME,
      this.buildUserByScreenNameParams(username)
    )) as UserByScreenNameResponse

    return response.data?.user?.result?.rest_id || null
  }

  private static buildUserByScreenNameParams(username: string) {
    const variables = { screen_name: username }
    const features = {
      responsive_web_grok_bio_auto_translation_is_enabled: true,
      hidden_profile_subscriptions_enabled: true,
      payments_enabled: true,
      profile_label_improvements_pcf_label_in_post_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      verified_phone_label_enabled: true,
      subscriptions_verification_info_is_identity_verified_enabled: true,
      subscriptions_verification_info_verified_since_enabled: true,
      highlights_tweets_tab_ui_enabled: true,
      responsive_web_twitter_article_notes_tab_enabled: true,
      subscriptions_feature_can_gift_premium: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: true,
      responsive_web_graphql_timeline_navigation_enabled: true
    }
    const fieldToggles = { withAuxiliaryUserLabels: true }

    return {
      variables: JSON.stringify(variables),
      features: JSON.stringify(features),
      fieldToggles: JSON.stringify(fieldToggles)
    }
  }

  private static buildUserTweetsParams(userId: string) {
    const variables = {
      userId,
      count: 20,
      includePromotedContent: true,
      withQuickPromoteEligibilityTweetFields: true,
      withVoice: true,
      withV2Timeline: true
    }

    const features = {
      rweb_video_screen_enabled: true,
      payments_enabled: true,
      profile_label_improvements_pcf_label_in_post_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      verified_phone_label_enabled: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: true,
      premium_content_api_read_enabled: true,
      communities_web_enable_tweet_community_results_fetch: true,
      c9s_tweet_anatomy_moderator_badge_enabled: true,
      responsive_web_grok_analyze_button_fetch_trends_enabled: true,
      responsive_web_grok_analyze_post_followups_enabled: true,
      responsive_web_jetfuel_frame: true,
      responsive_web_grok_share_attachment_enabled: true,
      articles_preview_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: true,
      tweet_awards_web_tipping_enabled: true,
      responsive_web_grok_show_grok_translated_post: true,
      responsive_web_grok_analysis_button_from_backend: true,
      creator_subscriptions_quote_tweet_preview_enabled: true,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled:
        true,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: true,
      responsive_web_grok_image_annotation_enabled: true,
      responsive_web_enhance_cards_enabled: true
    }

    const fieldToggles = {
      withArticleRichContentState: true,
      withGrokAnalyze: true,
      withAuxiliaryUserLabels: true,
      withArticlePlainText: true
    }

    return {
      variables: JSON.stringify(variables),
      features: JSON.stringify(features),
      fieldToggles: JSON.stringify(fieldToggles)
    }
  }

  private static extractTweetsFromUserTimeline(
    payload: unknown,
    fallbackUsername: string
  ) {
    const entries = this.extractTimelineEntries(payload)
    const tweets = new Map<string, BubbleNotifyTweet>()

    for (const entry of entries) {
      const entryId = this.asRecord(entry).entryId
      const idFromEntry =
        typeof entryId === 'string' && entryId.startsWith('tweet-')
          ? entryId.slice('tweet-'.length)
          : null

      const tweetResult = this.findTweetResult(entry)

      const restId = this.pickString(tweetResult, ['rest_id'])
      const tweetId = idFromEntry || restId

      if (!tweetId || !/^\d+$/.test(tweetId)) continue

      const legacy = this.pickRecord(tweetResult, ['legacy'])
      const fullText = this.pickString(legacy, ['full_text']) || ''

      const screenName =
        this.pickString(tweetResult, [
          'core',
          'user_results',
          'result',
          'legacy',
          'screen_name'
        ]) || fallbackUsername

      const isReply =
        !!this.pickString(legacy, ['in_reply_to_status_id_str']) || false

      const isRetweet =
        !!this.pickString(legacy, ['retweeted_status_id_str']) ||
        !!this.pickRecord(legacy, ['retweeted_status_result'])

      tweets.set(tweetId, {
        id: tweetId,
        text: fullText,
        authorUsername: screenName,
        url: `https://x.com/${screenName}/status/${tweetId}`,
        isReply,
        isRetweet
      })
    }

    return [...tweets.values()]
  }

  private static extractTimelineEntries(payload: unknown) {
    const instructions = this.findObjects(
      payload,
      (obj) => obj.type === 'TimelineAddEntries'
    )

    for (const instruction of instructions) {
      if (Array.isArray(instruction.entries)) {
        return instruction.entries
      }
    }

    return [] as unknown[]
  }

  private static findTweetResult(entry: unknown) {
    const candidates = this.findObjects(entry, (obj) => {
      const restId = obj.rest_id
      const legacy = obj.legacy

      return (
        typeof restId === 'string' &&
        /^\d+$/.test(restId) &&
        typeof legacy === 'object' &&
        legacy !== null &&
        ('full_text' in legacy || 'created_at' in legacy)
      )
    })

    return candidates[0] || null
  }

  private static findObjects(
    input: unknown,
    predicate: (obj: UnknownRecord) => boolean
  ) {
    const results: UnknownRecord[] = []

    const walk = (node: unknown) => {
      if (Array.isArray(node)) {
        for (const item of node) walk(item)
        return
      }

      if (!node || typeof node !== 'object') return

      const record = node as UnknownRecord
      if (predicate(record)) {
        results.push(record)
      }

      for (const value of Object.values(record)) {
        walk(value)
      }
    }

    walk(input)
    return results
  }

  private static asRecord(value: unknown) {
    if (!value || typeof value !== 'object') return {} as UnknownRecord
    return value as UnknownRecord
  }

  private static pickRecord(base: unknown, keys: string[]) {
    let current: unknown = base

    for (const key of keys) {
      if (!current || typeof current !== 'object') return null
      current = (current as UnknownRecord)[key]
    }

    return current && typeof current === 'object'
      ? (current as UnknownRecord)
      : null
  }

  private static pickString(base: unknown, keys: string[]) {
    let current: unknown = base

    for (const key of keys) {
      if (!current || typeof current !== 'object') return null
      current = (current as UnknownRecord)[key]
    }

    return typeof current === 'string' ? current : null
  }

  private static async ensureAuthenticated(authToken: string) {
    if (this.state && this.state.authToken === authToken) {
      return
    }

    const homeResponse = await fetch('https://x.com/?mx=2', {
      headers: {
        'user-agent': REQUEST_USER_AGENT,
        'sec-ch-ua-platform': '"Linux"',
        'sec-ch-ua': REQUEST_USER_AGENT_CH,
        'sec-ch-ua-mobile': '?0',
        accept: '*/*',
        'accept-language': 'en-PK,en;q=0.9',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        cookie: `auth_token=${authToken}`
      },
      signal: AbortSignal.timeout(30_000)
    })

    if (!homeResponse.ok) {
      throw new Error(
        `[BubbleXNotifyService] Failed to initialize session: HTTP ${homeResponse.status}`
      )
    }

    const homeHtml = await homeResponse.text()
    const csrfToken = this.extractCt0(homeResponse)
    const verificationKey = this.extractVerificationKey(homeHtml)

    if (!csrfToken) {
      throw new Error('[BubbleXNotifyService] Cannot extract ct0 token.')
    }

    if (!verificationKey) {
      throw new Error('[BubbleXNotifyService] Cannot extract verification key.')
    }

    this.state = {
      authToken,
      csrfToken,
      verificationKey
    }
  }

  private static async tweetyGet(url: string, params: Record<string, string>) {
    if (!this.state) {
      throw new Error('[BubbleXNotifyService] Missing authenticated state.')
    }

    const endpoint = new URL(url)
    endpoint.search = new URLSearchParams(params).toString()

    let response: Response | null = null
    let lastError: unknown = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await fetch(endpoint, {
          headers: this.buildTweetyHeaders('GET', endpoint),
          signal: AbortSignal.timeout(30_000)
        })

        if (response.ok) break
      } catch (error) {
        lastError = error
      }

      if (attempt < MAX_RETRIES) {
        await this.wait(500 * attempt)
      }
    }

    if (!response) {
      this.state = null
      throw new Error(
        `[BubbleXNotifyService] Request failed after ${MAX_RETRIES} retries: ${String(lastError)}`
      )
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      this.state = null
      throw new Error(
        `[BubbleXNotifyService] HTTP ${response.status}: ${body.slice(0, 300)}`
      )
    }

    const refreshedCt0 = this.extractCt0(response)
    if (refreshedCt0 && this.state) {
      this.state.csrfToken = refreshedCt0
    }

    return response.json()
  }

  private static buildTweetyHeaders(method: string, url: URL) {
    if (!this.state) {
      throw new Error('[BubbleXNotifyService] Missing authenticated state.')
    }

    const headers: Record<string, string> = {
      accept: '*/*',
      'accept-language': 'en-PK,en;q=0.9',
      'content-type': 'application/json',
      referer: 'https://x.com/',
      authorization: DEFAULT_BEARER_TOKEN,
      'sec-ch-ua': REQUEST_USER_AGENT_CH,
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': REQUEST_USER_AGENT,
      'x-csrf-token': this.state.csrfToken,
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
      'x-twitter-auth-type': 'OAuth2Session',
      priority: 'u=1, i',
      'x-client-uuid': randomUUID(),
      'x-client-transaction-id': this.generateTransactionId(method, url.pathname),
      cookie: `auth_token=${this.state.authToken}; ct0=${this.state.csrfToken}`
    }

    return headers
  }

  private static extractCt0(response: Response) {
    const headersAny = response.headers as Headers & {
      getSetCookie?: () => string[]
    }

    const setCookies = headersAny.getSetCookie?.() || []
    for (const setCookie of setCookies) {
      const match = setCookie.match(/(?:^|;\s*)ct0=([^;]+)/)
      if (match?.[1]) return match[1]
    }

    const singleCookie = response.headers.get('set-cookie') || ''
    const fallbackMatch = singleCookie.match(/(?:^|;\s*)ct0=([^;]+)/)
    return fallbackMatch?.[1] || null
  }

  private static extractVerificationKey(html: string) {
    const firstPattern = html.match(
      /<meta[^>]*name=["']twitter-site-verification["'][^>]*content=["']([^"']+)["']/i
    )
    if (firstPattern?.[1]) return firstPattern[1]

    const secondPattern = html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter-site-verification["']/i
    )

    return secondPattern?.[1] || null
  }

  private static generateTransactionId(method: string, path: string) {
    if (!this.state) {
      throw new Error('[BubbleXNotifyService] Missing authenticated state.')
    }

    const keyBytes = Array.from(Buffer.from(this.state.verificationKey, 'base64'))

    const now = Math.floor((Date.now() - 1682924400 * 1000) / 1000)
    const nowBytes = [0, 1, 2, 3].map((i) => (now >> (i * 8)) & 0xff)

    const message = `${method}!${path}!${now}${DEFAULT_KEYWORD}0`
    const hash = createHash('sha256').update(message).digest()

    const random = randomInt(0, 256)
    const payloadBytes = [...keyBytes, ...nowBytes, ...hash.subarray(0, 16), 3]
    const encrypted = Buffer.from([
      random,
      ...payloadBytes.map((byte) => byte ^ random)
    ])

    return encrypted.toString('base64').replace(/=/g, '')
  }

  private static compareTweetIdDesc(a: string, b: string) {
    try {
      const aBig = BigInt(a)
      const bBig = BigInt(b)
      if (aBig > bBig) return -1
      if (aBig < bBig) return 1
      return 0
    } catch {
      return b.localeCompare(a)
    }
  }

  private static wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
