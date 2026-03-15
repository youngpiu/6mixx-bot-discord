import { ContainerBuilder } from 'discord.js'
import type { LastFmAccount } from '~/../generated/prisma/client'

import { LastFmApiService } from '~/modules/lastfm/services/lastFmApiService'

export interface Score {
  userId: string
  count: number
}

export interface WhoknowsResult {
  scores: Score[]
  artistName: string
  entryName?: string
  thumbnail?: string
  error?: string
}

/**
 * Runs async tasks in batches to avoid overwhelming external APIs.
 */
export async function batchAsync<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
  return results
}

/**
 * Common logic to get the current artist from a user's now playing.
 */
export async function getCurrentArtist(
  account: LastFmAccount | null
): Promise<string | null> {
  if (!account) return null
  try {
    const recent = await LastFmApiService.getRecentTracks(
      account.lastfmUsername,
      1
    )
    const track = Array.isArray(recent.recenttracks.track)
      ? recent.recenttracks.track[0]
      : recent.recenttracks.track
    if (!track) return null
    return typeof track.artist === 'string'
      ? track.artist
      : track.artist.name || track.artist['#text'] || null
  } catch {
    return null
  }
}

/**
 * Common container formatter for whoknows commands.
 */
export function formatWhoknowsContainer(
  type: 'artist' | 'track' | 'album',
  result: WhoknowsResult,
  sortedScores: Score[]
): ContainerBuilder {
  const {
    artistName: finalArtistName,
    entryName: finalEntryName,
    thumbnail
  } = result
  const title =
    type === 'artist'
      ? `Ai nghe ${finalArtistName} nhiều nhất?`
      : `Ai nghe ${finalEntryName} của ${finalArtistName} nhiều nhất?`

  const list = sortedScores
    .slice(0, 10)
    .map((s: Score, i: number) => {
      return `${i + 1}. <@${s.userId}> : **${s.count.toLocaleString()}** lượt nghe`
    })
    .join('\n')

  return new ContainerBuilder()
    .addSectionComponents((section) => {
      section.addTextDisplayComponents(
        (t) => t.setContent(`### ${title}`),
        (t) =>
          t.setContent(
            `[Xem trên Last.fm](https://www.last.fm/music/${encodeURIComponent(finalArtistName)})`
          )
      )

      section.setThumbnailAccessory((thumb) =>
        thumb.setURL(
          thumbnail ||
            'https://www.last.fm/static/images/lastfm_logo_facebook.1a98059635f1.png'
        )
      )
      return section
    })
    .addSeparatorComponents((s) => s)
    .addTextDisplayComponents((t) => t.setContent(list))
    .addSeparatorComponents((s) => s)
    .addTextDisplayComponents((t) =>
      t.setContent(
        `-# Tổng cộng ${sortedScores.length} người nghe | Dữ liệu từ Last.fm`
      )
    )
}
