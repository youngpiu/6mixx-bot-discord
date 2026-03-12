import { container } from '@sapphire/pieces'

import { CacheService } from '~/shared/services/cacheService'

export type WordChainMode = 'vi' | 'en'

export interface WordChainState {
  sessionId: string // BigInt serialized as string
  mode: WordChainMode
  startWord: string
  currentLastWord: string // Vietnamese: last word of 2-word phrase; English: last letter of single word
  usedWordIndex: Record<string, Record<string, true>> // O(1) membership index by firstWord/firstLetter
  usedWordCountByGroup: Record<string, number> // O(1) used-word count by firstWord/firstLetter
  playersScore: Record<string, number> // userId → score
  hintsUsed: Record<string, number> // userId → count
  lastPlayerId?: string // userId of last person who answered
  totalWords: number // total correct words played by players (excludes bot's start word)
  status: 'running' | 'paused'
}

interface LegacyWordChainState extends Omit<
  WordChainState,
  'usedWordCountByGroup'
> {
  usedWordCountByGroup?: Record<string, number>
  usedWords?: Record<string, string[]>
}

const STATE_KEY = (guildId: string, mode: WordChainMode) =>
  `wordChain:guild:${guildId}:${mode}`
const LOCK_KEY = (guildId: string, mode: WordChainMode) =>
  `wordChain:lock:${guildId}:${mode}`
const LOCK_TTL_SECONDS = 10

// Vietnamese dictionary keys (2-word phrases grouped by firstWord)
const VI_DICTIONARY_KEY = (firstWord: string) =>
  `wordChain:viDictionary:${firstWord}`
const VI_DICTIONARY_LOADED_KEY = 'wordChain:viDictionary:loaded'

// English dictionary keys (single words grouped by firstLetter)
const EN_DICTIONARY_KEY = (firstLetter: string) =>
  `wordChain:enDictionary:${firstLetter}`
const EN_DICTIONARY_LOADED_KEY = 'wordChain:enDictionary:loaded'

export class WordChainRedisService {
  // ─── Vietnamese Dictionary Cache ──────────────────────────────────────

  public static async isViDictionaryLoaded(): Promise<boolean> {
    return (await CacheService.get<string>(VI_DICTIONARY_LOADED_KEY)) === '1'
  }

  public static async setViDictionaryLoaded(): Promise<void> {
    await CacheService.set(VI_DICTIONARY_LOADED_KEY, '1')
  }

  public static async addViPhrasesToDictionary(
    firstWord: string,
    phrases: string[]
  ): Promise<void> {
    if (phrases.length === 0) return
    await CacheService.sadd(VI_DICTIONARY_KEY(firstWord), ...phrases)
  }

  public static async hasViPhrase(phrase: string): Promise<boolean> {
    const firstWord = phrase.split(/\s+/)[0].toLowerCase()
    return CacheService.sismember(VI_DICTIONARY_KEY(firstWord), phrase)
  }

  public static async hasViPhraseInGroup(
    firstWord: string,
    phrase: string
  ): Promise<boolean> {
    return CacheService.sismember(
      VI_DICTIONARY_KEY(firstWord.toLowerCase()),
      phrase
    )
  }

  public static async checkExistingViPhrases(
    phrases: string[]
  ): Promise<string[]> {
    if (phrases.length === 0) return []

    const pipeline = CacheService.pipeline()
    for (const phrase of phrases) {
      const firstWord = phrase.split(/\s+/)[0].toLowerCase()
      pipeline.sismember(VI_DICTIONARY_KEY(firstWord), phrase)
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

  public static async countViStartingWith(firstWord: string): Promise<number> {
    return CacheService.scard(VI_DICTIONARY_KEY(firstWord))
  }

  public static async getRandomViStartingWith(
    firstWord: string
  ): Promise<string | null> {
    return CacheService.srandmember(VI_DICTIONARY_KEY(firstWord))
  }

  public static async clearAllViDictionary(): Promise<void> {
    await CacheService.invalidatePattern('wordChain:viDictionary:*')
    await CacheService.delete(VI_DICTIONARY_LOADED_KEY)
  }

  // ─── English Dictionary Cache ─────────────────────────────────────────

  public static async isEnDictionaryLoaded(): Promise<boolean> {
    return (await CacheService.get<string>(EN_DICTIONARY_LOADED_KEY)) === '1'
  }

  public static async setEnDictionaryLoaded(): Promise<void> {
    await CacheService.set(EN_DICTIONARY_LOADED_KEY, '1')
  }

  public static async addEnWordsToDictionary(
    firstLetter: string,
    words: string[]
  ): Promise<void> {
    if (words.length === 0) return
    await CacheService.sadd(EN_DICTIONARY_KEY(firstLetter), ...words)
  }

  public static async hasEnWord(word: string): Promise<boolean> {
    const firstLetter = word[0].toLowerCase()
    return CacheService.sismember(EN_DICTIONARY_KEY(firstLetter), word)
  }

  public static async hasEnWordInGroup(
    firstLetter: string,
    word: string
  ): Promise<boolean> {
    return CacheService.sismember(
      EN_DICTIONARY_KEY(firstLetter.toLowerCase()),
      word
    )
  }

  public static async checkExistingEnWords(words: string[]): Promise<string[]> {
    if (words.length === 0) return []

    const pipeline = CacheService.pipeline()
    for (const word of words) {
      const firstLetter = word[0].toLowerCase()
      pipeline.sismember(EN_DICTIONARY_KEY(firstLetter), word)
    }

    const results = await pipeline.exec()
    if (!results) return []

    const existing: string[] = []
    results.forEach(([err, result], index) => {
      if (!err && result === 1) {
        existing.push(words[index])
      }
    })

    return existing
  }

  public static async countEnStartingWith(
    firstLetter: string
  ): Promise<number> {
    return CacheService.scard(EN_DICTIONARY_KEY(firstLetter))
  }

  public static async getRandomEnStartingWith(
    firstLetter: string
  ): Promise<string | null> {
    return CacheService.srandmember(EN_DICTIONARY_KEY(firstLetter))
  }

  public static async clearAllEnDictionary(): Promise<void> {
    await CacheService.invalidatePattern('wordChain:enDictionary:*')
    await CacheService.delete(EN_DICTIONARY_LOADED_KEY)
  }

  // ─── State ───────────────────────────────────────────────────────────

  public static async getState(
    guildId: string,
    mode: WordChainMode
  ): Promise<WordChainState | null> {
    const state = await CacheService.get<LegacyWordChainState>(
      STATE_KEY(guildId, mode)
    )
    if (!state) return null

    // Normalize state: handle legacy data or missing fields
    if (!state.hintsUsed) state.hintsUsed = {}
    if (!state.playersScore) state.playersScore = {}
    if (!state.usedWordIndex) {
      state.usedWordIndex = {}
      for (const [group, words] of Object.entries(state.usedWords ?? {})) {
        if (!words?.length) continue
        const index: Record<string, true> = {}
        for (const word of words) {
          index[word] = true
        }
        state.usedWordIndex[group] = index
      }
    }
    if (!state.usedWordCountByGroup) {
      state.usedWordCountByGroup = {}
      for (const [group, index] of Object.entries(state.usedWordIndex)) {
        state.usedWordCountByGroup[group] = Object.keys(index).length
      }
    }
    if (!state.totalWords) state.totalWords = 0

    return state as WordChainState
  }

  public static async setState(
    guildId: string,
    mode: WordChainMode,
    state: WordChainState
  ): Promise<void> {
    await CacheService.set(STATE_KEY(guildId, mode), state)
  }

  public static async deleteState(
    guildId: string,
    mode: WordChainMode
  ): Promise<void> {
    await CacheService.delete(STATE_KEY(guildId, mode))
  }

  public static async setStatus(
    guildId: string,
    mode: WordChainMode,
    status: 'running' | 'paused'
  ): Promise<boolean> {
    const state = await this.getState(guildId, mode)
    if (!state) return false
    state.status = status
    await this.setState(guildId, mode, state)
    return true
  }

  // ─── Distributed Lock ────────────────────────────────────────────────

  public static async acquireLock(
    guildId: string,
    mode: WordChainMode
  ): Promise<boolean> {
    const result = await container.redis.set(
      LOCK_KEY(guildId, mode),
      '1',
      'EX',
      LOCK_TTL_SECONDS,
      'NX'
    )
    return result === 'OK'
  }

  public static async releaseLock(
    guildId: string,
    mode: WordChainMode
  ): Promise<void> {
    await container.redis.del(LOCK_KEY(guildId, mode))
  }
}
