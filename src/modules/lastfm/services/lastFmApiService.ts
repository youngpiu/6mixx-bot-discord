import Bottleneck from 'bottleneck'

import { env } from '~/shared/config/env'

export interface LastFmImage {
  '#text': string
  size: string
}

export interface LastFmTrack {
  name: string
  artist: {
    '#text'?: string
    name?: string
    mbid: string
    url?: string
    image?: LastFmImage[]
  }
  album: {
    '#text'?: string
    title?: string
    mbid: string
  }
  url: string
  image: LastFmImage[]
  '@attr'?: { nowplaying: 'true' }
  date?: { uts: string; '#text': string }
}

export interface LastFmRecentTracks {
  recenttracks: {
    track: LastFmTrack[] | LastFmTrack
    '@attr': {
      user: string
      totalPages: string
      page: string
      perPage: string
      total: string
    }
  }
}

export interface LastFmUserInfo {
  user: {
    name: string
    playcount: string
    url: string
    image: LastFmImage[]
    registered: { unixtime: string }
  }
}

export interface LastFmArtistInfo {
  artist: {
    name: string
    stats: {
      listeners: string
      playcount: string
      userplaycount?: string
    }
    bio: { summary: string; content: string }
    tags: { tag: { name: string; url: string }[] }
    image: LastFmImage[]
  }
}

export interface LastFmAlbumInfo {
  album: {
    name: string
    artist: string
    playcount: string
    listeners: string
    url: string
    userplaycount?: string
    image: LastFmImage[]
    tags: { tag: { name: string; url: string }[] }
    tracks?: {
      track:
        | { name: string; duration: string; url: string }[]
        | { name: string; duration: string; url: string }
    }
  }
}

export interface LastFmTrackInfo {
  track: {
    name: string
    artist: { name: string }
    album?: { title: string; image: LastFmImage[] }
    userplaycount?: string
    toptags: { tag: { name: string; url: string }[] }
  }
}

export interface LastFmTopArtists {
  topartists: {
    artist: {
      name: string
      playcount: string
      url: string
      image: LastFmImage[]
    }[]
    '@attr': {
      user: string
      total: string
      page: string
      totalPages: string
    }
  }
}

export interface LastFmTopTracks {
  toptracks: {
    track: {
      name: string
      playcount: string
      artist: { name: string; url: string }
      url: string
      image: LastFmImage[]
    }[]
    '@attr': {
      user: string
      total: string
      page: string
      totalPages: string
    }
  }
}

export interface LastFmTopAlbums {
  topalbums: {
    album: {
      name: string
      playcount: string
      artist: { name: string; url: string }
      url: string
      image: LastFmImage[]
    }[]
    '@attr': {
      user: string
      total: string
      page: string
      totalPages: string
    }
  }
}

export class LastFmApiService {
  private static readonly BASE_URL = 'https://ws.audioscrobbler.com/2.0/'
  private static readonly limiter = new Bottleneck({
    minTime: 200 // 5 requests per second
  })

  /**
   * General caller for Last.fm API.
   */
  private static async call<T>(
    method: string,
    params: Record<string, string>
  ): Promise<T> {
    return this.limiter.schedule(() => this._call<T>(method, params))
  }

  private static async _call<T>(
    method: string,
    params: Record<string, string>,
    retries = 3
  ): Promise<T> {
    interface LastFmError {
      error: number
      message: string
    }

    const apiKey = env.LASTFM_API_KEY

    const searchParams = new URLSearchParams({
      method,
      api_key: apiKey,
      format: 'json',
      ...params
    })

    const url = `${this.BASE_URL}?${searchParams.toString()}`

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              '6mixx-bot/1.1.0 (https://github.com/yngpiu/6mixx-bot-discord)'
          },
          // @ts-expect-error - undici/node fetch specific
          next: { revalidate: 0 }
        })

        const data = await response.json()

        if (!response.ok || (data as LastFmError).error) {
          const errorData = data as LastFmError
          const errorMsg = errorData.message || response.statusText
          throw new Error(`Last.fm API error: ${errorMsg}`)
        }

        return data as T
      } catch (error: unknown) {
        const err = error as { name?: string; code?: string; message?: string }
        const isNetworkError =
          err.name === 'TypeError' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ECONNRESET'

        if (isNetworkError && attempt < retries) {
          const delay = attempt * 1000 // Linear backoff
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        throw error
      }
    }

    throw new Error('Max retries reached')
  }

  /**
   * user.getRecentTracks
   */
  public static async getRecentTracks(username: string, limit = 1, page = 1) {
    return this.call<LastFmRecentTracks>('user.getrecenttracks', {
      user: username,
      limit: limit.toString(),
      page: page.toString(),
      extended: '1'
    })
  }

  /**
   * user.getInfo
   */
  public static async getUserInfo(username: string) {
    return this.call<LastFmUserInfo>('user.getinfo', { user: username })
  }

  /**
   * artist.getInfo
   */
  public static async getArtistInfo(artist: string, username?: string) {
    const params: Record<string, string> = { artist }
    if (username) params.username = username
    return this.call<LastFmArtistInfo>('artist.getinfo', params)
  }

  /**
   * album.getinfo
   */
  public static async getAlbumInfo(
    artist: string,
    album: string,
    username?: string
  ) {
    const params: Record<string, string> = { artist, album }
    if (username) params.username = username
    return this.call<LastFmAlbumInfo>('album.getinfo', params)
  }

  /**
   * track.getInfo
   */
  public static async getTrackInfo(
    artist: string,
    track: string,
    username?: string
  ) {
    const params: Record<string, string> = { artist, track }
    if (username) params.username = username
    return this.call<LastFmTrackInfo>('track.getinfo', params)
  }

  /**
   * user.getTopArtists
   */
  public static async getUserTopArtists(
    username: string,
    period = 'overall',
    limit = 10
  ) {
    return this.call<LastFmTopArtists>('user.gettopartists', {
      user: username,
      period,
      limit: limit.toString()
    })
  }

  /**
   * user.getTopAlbums
   */
  public static async getUserTopAlbums(
    username: string,
    period = 'overall',
    limit = 10
  ) {
    return this.call<LastFmTopAlbums>('user.gettopalbums', {
      user: username,
      period,
      limit: limit.toString()
    })
  }

  /**
   * user.getTopTracks
   */
  public static async getUserTopTracks(
    username: string,
    period = 'overall',
    limit = 10
  ) {
    return this.call<LastFmTopTracks>('user.gettoptracks', {
      user: username,
      period,
      limit: limit.toString()
    })
  }
}
