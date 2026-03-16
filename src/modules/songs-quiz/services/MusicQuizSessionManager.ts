import type { AudioPlayer, VoiceConnection } from '@discordjs/voice'

import {
  MusicQuizRedisService,
  MusicQuizState
} from '~/modules/songs-quiz/services/MusicQuizRedisService'

/**
 * Stores active Discord handles that cannot be serialized for Redis.
 */
export interface QuizActiveHandles {
  connection: VoiceConnection
  player: AudioPlayer
  timeoutId?: NodeJS.Timeout
}

export class MusicQuizSessionManager {
  private static handles = new Map<string, QuizActiveHandles>()

  /**
   * Get active voice/player handles.
   */
  public static getHandles(guildId: string): QuizActiveHandles | undefined {
    return this.handles.get(guildId)
  }

  /**
   * Save active voice/player handles in memory.
   */
  public static setHandles(guildId: string, handles: QuizActiveHandles) {
    this.handles.set(guildId, handles)
  }

  /**
   * Complete session cleanup (Memory + Redis).
   */
  public static async clearSession(guildId: string) {
    this.handles.delete(guildId)
    await MusicQuizRedisService.deleteState(guildId)
  }

  /**
   * Check if session is active (Metadata in Redis).
   */
  public static async isSessionActive(guildId: string): Promise<boolean> {
    return MusicQuizRedisService.hasState(guildId)
  }

  /**
   * Get full state combine from Redis.
   */
  public static async getState(
    guildId: string
  ): Promise<MusicQuizState | null> {
    return MusicQuizRedisService.getState(guildId)
  }
}
