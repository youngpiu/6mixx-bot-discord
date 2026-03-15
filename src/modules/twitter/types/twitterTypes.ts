export interface TwitterMedia {
  type: 'video' | 'gif' | 'image' | 'photo'
  url: string
}

export interface TweetData {
  tweetId: string
  username: string
  screenName: string
  text: string
  timestamp: number
  media: TwitterMedia[]
  replies?: number
  retweets?: number
  likes?: number
  bookmarks?: number
}

export interface FXTwitterAuthor {
  name: string
  screen_name: string
}

export interface FXTwitterMediaItem {
  type: 'video' | 'gif' | 'image' | 'photo'
  url: string
}

export interface FXTwitterMedia {
  all?: FXTwitterMediaItem[]
  photos?: FXTwitterMediaItem[]
  videos?: FXTwitterMediaItem[]
}

export interface FXTwitterTweet {
  id: string
  url: string
  text: string
  author?: FXTwitterAuthor
  user_name?: string
  user_screen_name?: string
  created_timestamp?: number
  media?: FXTwitterMedia
  media_extended?: FXTwitterMediaItem[]
  replies?: number
  retweets?: number
  likes?: number
  bookmarks?: number
}

export interface FXTwitterResponse {
  code: number
  message: string
  tweet?: FXTwitterTweet
}
