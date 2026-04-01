const axios = require('axios')
const cheerio = require('cheerio')
const crypto = require('crypto')
const cookie = require('cookie')
const { v4: uuidv4 } = require('uuid')
const EventEmitter = require('events')

/**
 * Twitter Notifier - Module cho Node.js
 * Port chính xác từ thư viện Python 'tweety-ns' (tweety/http.py + tweety/builder.py)
 *
 * Cài đặt: npm install axios cheerio cookie uuid
 *
 * Cách dùng:
 *   const TwitterNotifier = require('./twitter-notifier');
 *   const notifier = new TwitterNotifier('YOUR_AUTH_TOKEN');
 *   notifier.on('tweet', (tweet) => { console.log(tweet); });
 *   notifier.start();
 */

// ============================================================
// PHẦN 1: Hằng số (lấy chính xác từ tweety/constants.py)
// ============================================================
const CONSTANTS = {
  // Bearer Token mặc định của Twitter Web (constants.py dòng 33)
  DEFAULT_BEARER_TOKEN:
    'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
  // User-Agent giả lập Chrome (constants.py dòng 30)
  REQUEST_USER_AGENT:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  // sec-ch-ua header (constants.py dòng 31)
  REQUEST_USER_AGENT_CH:
    '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
  // Platform cho sec-ch-ua-platform (constants.py dòng 32)
  REQUEST_PLATFORMS: ['Linux'],
  // Keyword dùng cho Transaction ID (transaction.py dòng 111)
  DEFAULT_KEYWORD: 'obfiowerehiring',
  // Số lần thử lại khi lỗi (http.py dòng 29)
  MAX_RETRIES: 3,
  // Thời gian quét mặc định (60 giây)
  POLL_INTERVAL_MS: 60000
}

// ============================================================
// PHẦN 2: Tạo Transaction ID (port từ tweety/transaction.py)
// ============================================================
class TransactionGenerator {
  constructor() {
    this.key = null
    this.keyBytes = []
    this.indices = { row: null, bytes: [] }
  }

  /**
   * Khởi tạo từ HTML trang chủ Twitter
   * Port từ transaction.py -> __init__ (dòng 116-122)
   */
  async init(html) {
    const $ = cheerio.load(html)
    // Lấy mã site-verification (transaction.py dòng 147-150)
    this.key = $("[name='twitter-site-verification']").attr('content')
    if (!this.key)
      throw new Error('Không tìm được mã twitter-site-verification')

    // Decode base64 thành bytes (transaction.py dòng 153)
    this.keyBytes = Array.from(Buffer.from(this.key, 'base64'))

    // Tìm file on-demand JS để lấy indices (transaction.py dòng 124-138)
    const onDemandMatch = html.match(/(\d+)\s*:\s*"ondemand\.s"/)
    if (onDemandMatch) {
      const pointer = onDemandMatch[1]
      const fileMatch = html.match(new RegExp(`${pointer}\\s*:\\s*"(\\w+)"`))
      if (fileMatch) {
        const fileName = fileMatch[1]
        const jsUrl = `https://abs.twimg.com/responsive-web/client-web/ondemand.s.${fileName}a.js`
        try {
          const jsRes = await axios.get(jsUrl, {
            headers: { 'User-Agent': CONSTANTS.REQUEST_USER_AGENT }
          })
          const indicesMatch = [
            ...jsRes.data.matchAll(/\(\w{1}\[(\d{1,2})\],\s*16\)/g)
          ]
          const indices = indicesMatch.map((m) => parseInt(m[1]))
          if (indices.length >= 2) {
            this.indices.row = indices[0]
            this.indices.bytes = indices.slice(1)
          }
        } catch (e) {
          // Dùng fallback nếu không tải được
        }
      }
    }
  }

  /**
   * Tạo Transaction ID
   * Port từ transaction.py -> generate_transaction_id (dòng 206-225)
   */
  generate(method, path) {
    const timeNow = Math.floor((Date.now() - 1682924400 * 1000) / 1000)
    const timeNowBytes = [0, 1, 2, 3].map((i) => (timeNow >> (i * 8)) & 0xff)

    const animationKey = '0'
    const msg = `${method}!${path}!${timeNow}${CONSTANTS.DEFAULT_KEYWORD}${animationKey}`
    const hash = crypto.createHash('sha256').update(msg).digest()

    const randomNum = Math.floor(Math.random() * 256)
    const bytesArr = [
      ...this.keyBytes,
      ...timeNowBytes,
      ...hash.slice(0, 16),
      3
    ]
    const out = Buffer.from([randomNum, ...bytesArr.map((b) => b ^ randomNum)])

    return out.toString('base64').replace(/=/g, '')
  }
}

// ============================================================
// PHẦN 3: Module chính - TwitterNotifier
// ============================================================
class TwitterNotifier extends EventEmitter {
  /**
   * @param {string} authToken - Token xác thực (lấy từ Cookie trình duyệt)
   * @param {object} options
   * @param {number} options.interval - Khoảng thời gian quét (ms), mặc định 60000
   */
  constructor(authToken, options = {}) {
    super()
    this.authToken = authToken
    this.interval = options.interval || CONSTANTS.POLL_INTERVAL_MS

    // Trạng thái nội bộ
    this._ct0 = null
    this._guestToken = null
    this._txGen = new TransactionGenerator()
    this._timer = null
    this._isRunning = false
    this._isFirstPoll = true // Lần quét đầu tiên: chỉ ghi nhận, không phát
    this._clientUuid = uuidv4() // http.py dòng 102: x-client-uuid

    // Danh sách username đã đăng ký theo dõi
    // Giống cách Tweetcord lưu trong DB rồi lọc qua get_tweets.py
    // Nếu rỗng = nhận TẤT CẢ thông báo
    this._subscribedUsers = new Set()

    // Chống lặp theo đúng Tweetcord:
    // Lưu timestamp tweet mới nhất CỦA TỪNG username
    // Giống account_tracker.py dòng 120: latest_tweet_timestamps[(username, client)]
    this._latestTimestamps = new Map() // Map<username, Date>
  }

  /**
   * Đăng ký theo dõi một hoặc nhiều username
   * Giống lệnh /add_notifier trong Tweetcord
   * @param {...string} usernames - Tên tài khoản Twitter (không cần @)
   */
  subscribe(...usernames) {
    for (const u of usernames) {
      const name = u.replace(/^@/, '').toLowerCase()
      this._subscribedUsers.add(name)
    }
    return this
  }

  /**
   * Hủy theo dõi một username
   * Giống lệnh /remove_notifier trong Tweetcord
   * @param {string} username
   */
  unsubscribe(username) {
    this._subscribedUsers.delete(username.replace(/^@/, '').toLowerCase())
    return this
  }

  /**
   * Xem danh sách username đang theo dõi
   * @returns {string[]}
   */
  getSubscriptions() {
    return [...this._subscribedUsers]
  }

  /**
   * Tạo bộ header đầy đủ theo đúng tweety/http.py -> _get_request_headers (dòng 83-125)
   * Đây là phần QUAN TRỌNG NHẤT để chống ban
   */
  _getRequestHeaders() {
    const headers = {
      // --- Header cơ bản (http.py dòng 40-44) ---
      'user-agent': CONSTANTS.REQUEST_USER_AGENT,
      'sec-ch-ua-platform': `"${CONSTANTS.REQUEST_PLATFORMS[0]}"`,
      'x-twitter-client-language': 'en',
      origin: 'https://x.com',

      // --- Header mặc định (http.py dòng 87-103) ---
      accept: '*/*',
      'accept-language': 'en-PK,en;q=0.9',
      'content-type': 'application/json', // http.py dòng 109: đổi thành json khi có cookie
      referer: 'https://x.com/',
      authorization: CONSTANTS.DEFAULT_BEARER_TOKEN,
      'sec-ch-ua': CONSTANTS.REQUEST_USER_AGENT_CH,
      'sec-ch-ua-mobile': '?0',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin', // http.py dòng 110: same-origin khi có cookie
      'x-csrf-token': this._ct0,
      'x-twitter-active-user': 'yes',
      priority: 'u=1, i',
      'x-client-uuid': this._clientUuid,

      // --- Header xác thực (http.py dòng 113) ---
      'x-twitter-auth-type': 'OAuth2Session', // CHỈ khi đã đăng nhập

      // --- Cookie ---
      cookie: `auth_token=${this.authToken}; ct0=${this._ct0}`
    }

    // Thêm guest token nếu có (http.py dòng 115-116)
    if (this._guestToken) {
      headers['x-guest-token'] = this._guestToken
    }

    return headers
  }

  /**
   * Bắt đầu quét thông báo
   */
  async start() {
    if (this._isRunning) return
    this._isRunning = true

    try {
      await this._authenticate()
      this.emit('ready')
      this._poll()
    } catch (err) {
      this.emit('error', err)
      this._isRunning = false
    }
  }

  /**
   * Dừng quét
   */
  stop() {
    this._isRunning = false
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }
    this.emit('stop')
  }

  /**
   * Xác thực + Lấy Guest Token + CSRF Token
   * Port từ tweety/auth.py -> load_auth_token + http.py -> _init_local_api (dòng 172-181)
   */
  async _authenticate() {
    // Bước 1: Lấy trang chủ Twitter (http.py dòng 260-288: get_home_html)
    // Dùng để lấy ct0 và khởi tạo TransactionGenerator
    const initHeaders = {
      'user-agent': CONSTANTS.REQUEST_USER_AGENT,
      'sec-ch-ua-platform': `"${CONSTANTS.REQUEST_PLATFORMS[0]}"`,
      'sec-ch-ua': CONSTANTS.REQUEST_USER_AGENT_CH,
      'sec-ch-ua-mobile': '?0',
      accept: '*/*',
      'accept-language': 'en-PK,en;q=0.9',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site'
    }

    // Truy cập trang chủ để lấy cookie ct0 (http.py dòng 266)
    const homeRes = await axios.get('https://x.com/?mx=2', {
      headers: {
        ...initHeaders,
        Cookie: `auth_token=${this.authToken}`
      },
      maxRedirects: 5
    })

    // Parse cookie từ response
    const cookiesHeader = homeRes.headers['set-cookie']
    if (!cookiesHeader) {
      throw new Error(
        'Twitter không trả về cookie. auth_token có thể đã hết hạn.'
      )
    }
    const parsedCookies = cookie.parse(cookiesHeader.join('; '))
    this._ct0 = parsedCookies.ct0

    if (!this._ct0) {
      throw new Error(
        'Không lấy được ct0 (CSRF Token). Kiểm tra lại auth_token.'
      )
    }

    // Bước 2: Khởi tạo Transaction Generator (http.py dòng 174-176)
    await this._txGen.init(homeRes.data)

    // Bước 3: Lấy Guest Token (http.py dòng 290-317: _get_guest_token)
    await this._fetchGuestToken()
  }

  /**
   * Lấy Guest Token
   * Port từ http.py -> _get_guest_token (dòng 290-317)
   */
  async _fetchGuestToken() {
    try {
      const res = await axios.post(
        'https://api.x.com/1.1/guest/activate.json',
        null,
        {
          headers: {
            authorization: CONSTANTS.DEFAULT_BEARER_TOKEN,
            'user-agent': CONSTANTS.REQUEST_USER_AGENT
          }
        }
      )
      this._guestToken = res.data.guest_token
    } catch (e) {
      // Fallback: tìm trong HTML trang chủ (http.py dòng 303-313)
      try {
        const res = await axios.get('https://x.com/', {
          headers: { 'user-agent': CONSTANTS.REQUEST_USER_AGENT }
        })
        const match = res.data.match(/gt=(\d+);/)
        if (match) this._guestToken = match[1]
      } catch (e2) {
        // Không sao, guest token không bắt buộc khi đã có auth_token
      }
    }
  }

  /**
   * Vòng lặp quét thông báo
   */
  async _poll() {
    if (!this._isRunning) return

    try {
      const tweets = await this._fetchNotifications()

      // Bước 1: Lọc theo username đã đăng ký
      // Giống get_tweets.py dòng 16: tweet.author.username == username
      let filtered = tweets
      if (this._subscribedUsers.size > 0) {
        filtered = tweets.filter((t) =>
          this._subscribedUsers.has(t.username.toLowerCase())
        )
      }

      // Bước 2: Chống lặp bằng timestamp (giống Tweetcord)
      // Giống get_tweets.py dòng 16: date_comparator(tweet.created_on, last_tweet_at) == 1
      // và account_tracker.py dòng 120-132
      const newTweets = []

      for (const tweet of filtered) {
        const userKey = tweet.username.toLowerCase()
        const tweetTime = new Date(tweet.timestamp)
        const lastTime = this._latestTimestamps.get(userKey)

        // Chỉ lấy tweet có thời gian MỚI HƠN timestamp đã lưu
        if (!lastTime || tweetTime > lastTime) {
          // Lần đầu chạy: chỉ ghi nhận timestamp, KHÔNG phát tweet
          // (tránh spam hàng loạt tweet cũ khi khởi động)
          if (!this._isFirstPoll) {
            newTweets.push(tweet)
          }
        }
      }

      // Cập nhật timestamp mới nhất cho từng username
      // Giống account_tracker.py dòng 130-132:
      //   newest_timestamp = latest_tweets[-1].created_on
      //   self.latest_tweet_timestamps[(username, client_used)] = str(newest_timestamp)
      for (const tweet of filtered) {
        const userKey = tweet.username.toLowerCase()
        const tweetTime = new Date(tweet.timestamp)
        const lastTime = this._latestTimestamps.get(userKey)

        if (!lastTime || tweetTime > lastTime) {
          this._latestTimestamps.set(userKey, tweetTime)
        }
      }

      this._isFirstPoll = false

      // Phát sự kiện cho từng tweet mới (sắp xếp theo thời gian tăng dần)
      newTweets.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      for (const tweet of newTweets) {
        this.emit('tweet', tweet)
      }
    } catch (err) {
      this.emit('error', err)
    }

    this._timer = setTimeout(() => this._poll(), this.interval)
  }

  /**
   * Gọi API lấy thông báo (có retry)
   * Port từ:
   *   - builder.py -> get_new_user_tweet_notification (dòng 1832-1870)
   *   - http.py -> __get_response__ (dòng 183-251) cho logic retry
   */
  async _fetchNotifications() {
    const method = 'GET'
    const path = '/i/api/2/notifications/device_follow.json'

    // Tạo Transaction ID (http.py dòng 191-195)
    const tid = this._txGen.generate(method, path)

    // Params đầy đủ theo builder.py -> get_new_user_tweet_notification (dòng 1833-1864)
    const params = {
      include_profile_interstitial_type: '1',
      include_blocking: '1',
      include_blocked_by: '1',
      include_followed_by: '1',
      include_want_retweets: '1',
      include_mute_edge: '1',
      include_can_dm: '1',
      include_can_media_tag: '1',
      include_ext_has_nft_avatar: '1',
      include_ext_is_blue_verified: '1',
      include_ext_verified_type: '1',
      include_ext_profile_image_shape: '1',
      skip_status: '1',
      cards_platform: 'Web-12',
      include_cards: '1',
      include_ext_alt_text: true,
      include_ext_limited_action_results: true,
      include_quote_count: true,
      include_reply_count: '1',
      tweet_mode: 'extended',
      include_ext_views: true,
      include_entities: true,
      include_user_entities: true,
      include_ext_media_color: true,
      include_ext_media_availability: true,
      include_ext_sensitive_media_warning: true,
      include_ext_trusted_friends_metadata: true,
      send_error_codes: true,
      simple_quoted_tweet: true,
      count: '50',
      ext: 'mediaStats,highlightedLabel,hasNftAvatar,voiceInfo,birdwatchPivot,superFollowMetadata,unmentionInfo,editControl'
    }

    // Header đầy đủ + Transaction ID
    const headers = this._getRequestHeaders()
    headers['x-client-transaction-id'] = tid

    // Retry logic (http.py dòng 200-209)
    let response = null
    let lastError = null

    for (let retry = 0; retry < CONSTANTS.MAX_RETRIES; retry++) {
      try {
        response = await axios.get(`https://x.com${path}`, { params, headers })
        break
      } catch (err) {
        lastError = err
        // Đợi một chút trước khi thử lại
        await new Promise((r) => setTimeout(r, 1000 * (retry + 1)))
      }
    }

    if (!response) {
      throw (
        lastError || new Error('Không thể kết nối tới Twitter sau 3 lần thử')
      )
    }

    // Cập nhật cookie ct0 nếu Twitter trả về cookie mới (http.py dòng 151-165)
    const newCookies = response.headers['set-cookie']
    if (newCookies) {
      const parsed = cookie.parse(newCookies.join('; '))
      if (parsed.ct0) {
        this._ct0 = parsed.ct0
      }
    }

    // Bóc tách dữ liệu
    const rawTweets = response.data.globalObjects?.tweets || {}
    const rawUsers = response.data.globalObjects?.users || {}

    return Object.keys(rawTweets)
      .sort((a, b) => b.localeCompare(a))
      .map((id) => {
        const tweet = rawTweets[id]
        const user = rawUsers[tweet.user_id_str] || {}
        return {
          id,
          text: tweet.full_text,
          username: user.screen_name || 'unknown',
          displayName: user.name || '',
          userId: tweet.user_id_str,
          userAvatar: user.profile_image_url_https || '',
          url: `https://x.com/${user.screen_name}/status/${id}`,
          timestamp: tweet.created_at,
          media: (tweet.extended_entities?.media || []).map((m) => ({
            type: m.type,
            url:
              m.type === 'video'
                ? m.video_info?.variants?.find(
                    (v) => v.content_type === 'video/mp4'
                  )?.url
                : m.media_url_https,
            thumbnail: m.media_url_https
          })),
          retweets: tweet.retweet_count,
          likes: tweet.favorite_count,
          isRetweet: !!tweet.retweeted_status_id_str,
          isReply: !!tweet.in_reply_to_status_id_str
        }
      })
  }
}

// ============================================================
// PHẦN 4: Chạy độc lập (nếu gọi trực tiếp: node twitter-notifier.js <token>)
// ============================================================
if (require.main === module) {
  const token = process.argv[2]
  if (!token) {
    console.log('--------------------------------------------------')
    console.log('Cách dùng: node twitter-notifier.js <auth_token>')
    console.log('Cài đặt:   npm install axios cheerio cookie uuid')
    console.log('--------------------------------------------------')
    process.exit(1)
  }

  const notifier = new TwitterNotifier(token)

  notifier.on('ready', () => {
    console.log('[✅] Xác thực thành công. Đang quét thông báo mỗi 60 giây...')
  })

  notifier.on('tweet', (tweet) => {
    console.log(
      `[📡 Tweet mới] @${tweet.username}: ${tweet.text.replace(/\n/g, ' ')}`
    )
    console.log(`    🔗 ${tweet.url}`)
    if (tweet.media.length > 0) {
      tweet.media.forEach((m) => console.log(`    📎 [${m.type}] ${m.url}`))
    }
    console.log('')
  })

  notifier.on('error', (err) => {
    console.error('[⚠️ Lỗi]', err.response?.data || err.message)
  })

  notifier.on('stop', () => {
    console.log('[⏹] Đã dừng quét.')
  })

  notifier.start()
}

module.exports = TwitterNotifier
