import { container } from '@sapphire/pieces'

import { CacheService } from '~/shared/services/cacheService'

export interface MusicQuizState {
  guildId: string
  textChannelId: string
  voiceChannelId: string
  currentSongId?: number
  roundStartTime?: number
  isEnding: boolean
  isRoundEnded?: boolean
  isPlaying?: boolean
}

const STATE_KEY = (guildId: string) => `musicQuiz:state:guild:${guildId}`

export class MusicQuizRedisService {
  /**
   * Saves the serializable state to Redis.
   */
  public static async saveState(
    guildId: string,
    state: MusicQuizState
  ): Promise<void> {
    await CacheService.set(STATE_KEY(guildId), state, 3600) // TTL 1 hour for safety
  }

  /**
   * Retrieves the state from Redis.
   */
  public static async getState(
    guildId: string
  ): Promise<MusicQuizState | null> {
    return CacheService.get<MusicQuizState>(STATE_KEY(guildId))
  }

  /**
   * Deletes the state from Redis.
   */
  public static async deleteState(guildId: string): Promise<void> {
    await CacheService.delete(STATE_KEY(guildId))
  }

  /**
   * Checks if a session state exists in Redis.
   */
  public static async hasState(guildId: string): Promise<boolean> {
    const exists = await container.redis.exists(STATE_KEY(guildId))
    return exists === 1
  }

  /**
   * Updates only specific fields in the Redis state.
   */
  public static async updateState(
    guildId: string,
    updates: Partial<MusicQuizState>
  ): Promise<void> {
    const state = await this.getState(guildId)
    if (state) {
      await this.saveState(guildId, { ...state, ...updates })
    }
  }
}
