export interface ThreadsMedia {
  type: 'image' | 'video'
  url: string
  previewUrl?: string
}

export interface ThreadsData {
  shortcode: string
  username: string
  caption: string
  media: ThreadsMedia[]
  timestamp?: number
  url: string
}
