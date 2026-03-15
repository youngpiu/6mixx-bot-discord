export interface SocialMediaItem {
  url: string
  type: 'image' | 'video' | 'gif' | 'photo'
}

export interface SocialStat {
  label: string
  value: number | string
}

export interface SocialPost {
  platform: 'instagram' | 'tiktok' | 'twitter' | 'threads'
  username: string
  authorUrl: string
  postUrl: string
  caption?: string
  timestamp?: number
  media: SocialMediaItem[]
  stats?: SocialStat[]
}
