export interface InstagramMedia {
  type: 'image' | 'video'
  url: string
}

export interface InstagramPostData {
  shortcode: string
  username: string
  caption?: string
  media: InstagramMedia[]
  timestamp?: number
  url: string
}
