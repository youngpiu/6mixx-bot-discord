export interface TikTokAuthor {
  id: string
  unique_id: string
  nickname: string
  avatar: string
}

export interface TikTokData {
  id: string
  title: string
  play: string
  cover: string
  origin_cover: string
  duration: number
  author: TikTokAuthor
  create_time: number
  play_count: number
  digg_count: number
  comment_count: number
  share_count: number
  download_count: number
  collect_count: number
}

export interface TikWMResponse {
  code: number
  msg: string
  data?: TikTokData
}
