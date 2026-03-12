import { container } from '@sapphire/pieces'

import { CacheService } from '~/shared/services/cacheService'

export interface VietnameseWordChainState {
  sessionId: string // BigInt serialized as string
  startWord: string
  currentLastWord: string
  usedWords: string[]
  playersScore: Record<string, number> // userId → score
  hintsUsed: Record<string, number>    // userId → count
  lastPlayerId?: string                // userId of last person who answered
  status: 'running' | 'paused'
}

const STATE_KEY = (guildId: string) => `vietnameseWordChain:guild:${guildId}`
const LOCK_KEY = (guildId: string) => `vietnameseWordChain:lock:${guildId}`
const LOCK_TTL_SECONDS = 10
const DICTIONARY_KEY = (firstWord: string) => `vietnameseWordChain:dictionary:${firstWord}`
const DICTIONARY_LOADED_KEY = 'vietnameseWordChain:dictionary:loaded'

export class VietnameseWordChainRedisService {
  // ─── Dictionary Cache ────────────────────────────────────────────────
  
  public static async isDictionaryLoaded(): Promise<boolean> {
    return (await CacheService.get<string>(DICTIONARY_LOADED_KEY)) === '1'
  }

  public static async setDictionaryLoaded(): Promise<void> {
    await CacheService.set(DICTIONARY_LOADED_KEY, '1')
  }

  public static async addPhrasesToDictionary(firstWord: string, phrases: string[]): Promise<void> {
    if (phrases.length === 0) return
    await CacheService.sadd(DICTIONARY_KEY(firstWord), ...phrases)
  }

  public static async hasPhrase(phrase: string): Promise<boolean> {
    const firstWord = phrase.split(/\s+/)[0].toLowerCase()
    return CacheService.sismember(DICTIONARY_KEY(firstWord), phrase)
  }

  /**
   * Check multiple phrases for existence in Redis.
   * Returns a list of phrases that already exist.
   */
  public static async checkExistingPhrases(phrases: string[]): Promise<string[]> {
    if (phrases.length === 0) return []

    const pipeline = CacheService.pipeline()
    for (const phrase of phrases) {
      const firstWord = phrase.split(/\s+/)[0].toLowerCase()
      pipeline.sismember(DICTIONARY_KEY(firstWord), phrase)
    }

    const results = await pipeline.exec()
    if (!results) return []

    const existing: string[] = []
    results.forEach(([err, result], index) => {
      if (!err && result === 1) {
        existing.push(phrases[index])
      }
    })

    return existing
  }

  public static async countStartingWith(firstWord: string): Promise<number> {
    return CacheService.scard(DICTIONARY_KEY(firstWord))
  }

  public static async getRandomStartingWith(firstWord: string): Promise<string | null> {
    return CacheService.srandmember(DICTIONARY_KEY(firstWord))
  }

  // ─── State ───────────────────────────────────────────────────────────

  public static async getState(
    guildId: string
  ): Promise<VietnameseWordChainState | null> {
    const state = await CacheService.get<VietnameseWordChainState>(STATE_KEY(guildId))
    if (!state) return null
    
    // Normalize state: handle legacy data or missing fields
    if (!state.hintsUsed) state.hintsUsed = {}
    if (!state.playersScore) state.playersScore = {}
    if (!state.usedWords) state.usedWords = []
    
    return state
  }

  public static async setState(
    guildId: string,
    state: VietnameseWordChainState
  ): Promise<void> {
    await CacheService.set(STATE_KEY(guildId), state)
  }

  public static async deleteState(guildId: string): Promise<void> {
    await CacheService.delete(STATE_KEY(guildId))
  }

  public static async setStatus(
    guildId: string,
    status: 'running' | 'paused'
  ): Promise<boolean> {
    const state = await this.getState(guildId)
    if (!state) return false
    state.status = status
    await this.setState(guildId, state)
    return true
  }

  // ─── Distributed Lock ────────────────────────────────────────────────
  // Prevents race conditions when multiple users send messages simultaneously.
  // Uses Redis SET NX EX pattern — only one worker holds the lock at a time.

  /**
   * Try to acquire the lock for this guild.
   * Returns true if acquired, false if another message is being processed.
   */
  public static async acquireLock(guildId: string): Promise<boolean> {
    const result = await container.redis.set(
      LOCK_KEY(guildId),
      '1',
      'EX',
      LOCK_TTL_SECONDS,
      'NX'
    )
    return result === 'OK'
  }

  /**
   * Release the lock for this guild.
   */
  public static async releaseLock(guildId: string): Promise<void> {
    await container.redis.del(LOCK_KEY(guildId))
  }

  /**
   * Clears all dictionary-related keys from Redis.
   */
  public static async clearAllDictionary(): Promise<void> {
    // Reuse CacheService.invalidatePattern for safer deletion with SCAN
    await CacheService.invalidatePattern('vietnameseWordChain:dictionary:*')
    await CacheService.delete(DICTIONARY_LOADED_KEY)
  }
}
