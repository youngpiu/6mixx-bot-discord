import { container } from '@sapphire/pieces'

import { CacheService } from '~/shared/services/cacheService'

/**
 * Represents an entry in the iChart rankings.
 */
export interface IChartRankEntry {
  /** The name of the chart (e.g., "Daily Chart", "TOP 100"). */
  chart: string
  /** The current rank on this chart. */
  rank: number | string
  /** The change in rank (positive for up, negative for down). */
  change: number
  /** The platform name in Korean (e.g., "멜론", "지니"). */
  platform: string
}

/**
 * Represents the response structure from the iChart API.
 */
export interface IChartResponse {
  /** Array of platform rows. */
  headers: string[]
  rows: {
    /** The platform name in Korean. */
    label: string
    /** Ranking data for various charts on this platform. */
    data: {
      chart: string
      rank: number
      change: number
    }[]
  }[]
}

/**
 * Service for fetching, caching, and formatting iChart music rankings.
 */
export class IChartService {
  /** The base URL for the iChart score detail API. */
  private static readonly API_URL =
    'https://api.instiz.net/v2/ichart/score/detail/'

  /** Mapping of Korean platform names to English. */
  private static readonly PLATFORM_MAP: Record<string, string> = {
    멜론: 'Melon',
    지니: 'Genie',
    '유튜브 뮤직': 'YouTube Music',
    플로: 'FLO',
    바이브: 'VIBE',
    벅스: 'Bugs',
    iChart: 'iChart'
  }

  /** Mapping of Korean chart names to English. */
  private static readonly CHART_MAP: Record<string, string> = {
    '일간 차트': 'Daily Chart',
    'TOP 100': 'TOP 100',
    'TOP 200': 'TOP 200',
    인기곡: 'Popular Songs',
    '24시간 인기곡': '24-hour Popular Songs',
    '오늘 TOP 100': 'Today’s TOP 100',
    '실시간 차트': 'Real-time Chart',
    '주간 차트': 'Weekly Chart'
  }

  /**
   * Generates a Redis cache key for a specific song's rankings.
   * @param songId - The ID of the song.
   * @returns The Redis key string.
   */
  private static getRankKey(songId: string) {
    return `status:ichart:ranks:${songId}`
  }

  /**
   * Fetches the latest rankings for a given song ID from the external API and caches them in Redis.
   * @param songId - The iChart song ID to fetch data for.
   * @returns A promise that resolves to an array of ranking entries.
   */
  public static async fetchRankings(
    songId: string
  ): Promise<IChartRankEntry[]> {
    try {
      const response = await fetch(`${this.API_URL}${songId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch iChart data: ${response.statusText}`)
      }

      const json = (await response.json()) as IChartResponse
      const ranks: IChartRankEntry[] = []

      for (const row of json.rows) {
        for (const data of row.data) {
          // Skip if rank is 0 or null/missing (often means not charted or data unavailable)
          if (!data.rank || data.rank === 0) continue

          ranks.push({
            platform: row.label,
            chart: data.chart,
            rank: data.rank,
            change: data.change
          })
        }
      }

      // Cache the rankings in Redis with a 1-hour expiration
      await CacheService.set(this.getRankKey(songId), ranks, 3600)

      return ranks
    } catch (error) {
      container.logger.error('[IChartService] Error fetching rankings:', error)
      return []
    }
  }

  /**
   * Retrieves the latest cached rankings for a song from Redis.
   * @param songId - The iChart song ID.
   * @returns A promise that resolves to the cached rankings or an empty array if not found.
   */
  public static async getLatestRanks(
    songId: string
  ): Promise<IChartRankEntry[]> {
    const cached = await CacheService.get<IChartRankEntry[]>(
      this.getRankKey(songId)
    )
    return cached ?? []
  }

  /**
   * Formats a ranking entry into a localized, human-readable English string suitable for Discord status.
   * @param entry - The ranking entry to format.
   * @returns A formatted string e.g., "Melon - TOP 100 | 1 ▲2".
   */
  public static formatRank(entry: IChartRankEntry): string {
    const platform = this.PLATFORM_MAP[entry.platform] ?? entry.platform
    const chart = this.CHART_MAP[entry.chart] ?? entry.chart
    const changeText = this.formatChange(entry.change)

    return `${platform} - ${chart} | ${entry.rank}${changeText}`
  }

  /**
   * Formats the rank change number into a string with arrow indicators.
   * @param change - The numeric change value.
   * @returns A formatted change string e.g., " ▲2", " ▼1", or an empty string for no change.
   */
  private static formatChange(change: number | null): string {
    if (change === null || change === 0) return ''
    if (change > 0) return ` ▲${change}`
    return ` ▼${Math.abs(change)}`
  }
}
