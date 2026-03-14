import { container } from '@sapphire/pieces'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const LEGACY_STATE_KEY = (guildId: string, mode: WordChainMode) =>
  `wordChain:guild:${guildId}:${mode}`
const STATE_META_KEY = (guildId: string, mode: WordChainMode) =>
  `wordChain:stateMeta:guild:${guildId}:${mode}`
const PLAYERS_SCORE_KEY = (guildId: string, mode: WordChainMode) =>
  `wordChain:playersScore:guild:${guildId}:${mode}`
const HINTS_USED_KEY = (guildId: string, mode: WordChainMode) =>
  `wordChain:hintsUsed:guild:${guildId}:${mode}`
const USED_COUNT_KEY = (guildId: string, mode: WordChainMode) =>
  `wordChain:usedCount:guild:${guildId}:${mode}`
const USED_GROUPS_KEY = (guildId: string, mode: WordChainMode) =>
  `wordChain:usedGroups:guild:${guildId}:${mode}`
const USED_SET_KEY = (guildId: string, mode: WordChainMode, group: string) =>
  `wordChain:usedSet:guild:${guildId}:${mode}:${group}`
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

type ViSubmitResult =
  | {
      status:
        | 'no_state'
        | 'paused'
        | 'same_player'
        | 'not_in_dictionary'
        | 'already_used'
    }
  | { status: 'invalid_chain'; expected: string }
  | { status: 'ok'; totalWords: number; remainingCount: number }

type EnSubmitResult =
  | { status: 'no_state' | 'paused' | 'not_in_dictionary' }
  | { status: 'invalid_chain'; expected: string }
  | {
      status: 'ok'
      totalWords: number
      remainingCount: number
      isRepeat: boolean
    }

const serviceDir = dirname(fileURLToPath(import.meta.url))
const SUBMIT_VI_LUA = readFileSync(
  join(serviceDir, 'lua', 'submit_vi.lua'),
  'utf8'
)
const SUBMIT_EN_LUA = readFileSync(
  join(serviceDir, 'lua', 'submit_en.lua'),
  'utf8'
)

export class WordChainRedisService {
  private static submitViSha: string | null = null
  private static submitEnSha: string | null = null

  private static async getSubmitViSha(): Promise<string> {
    if (this.submitViSha) return this.submitViSha
    this.submitViSha = (await container.redis.script(
      'LOAD',
      SUBMIT_VI_LUA
    )) as string
    return this.submitViSha
  }

  private static async getSubmitEnSha(): Promise<string> {
    if (this.submitEnSha) return this.submitEnSha
    this.submitEnSha = (await container.redis.script(
      'LOAD',
      SUBMIT_EN_LUA
    )) as string
    return this.submitEnSha
  }

  private static async evalShaWithFallback(
    getSha: () => Promise<string>,
    script: string,
    numKeys: number,
    ...args: string[]
  ) {
    try {
      const sha = await getSha()
      return await container.redis.evalsha(sha, numKeys, ...args)
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('NOSCRIPT')) {
        throw error
      }
      const reloadedSha = (await container.redis.script(
        'LOAD',
        script
      )) as string
      return container.redis.evalsha(reloadedSha, numKeys, ...args)
    }
  }

  public static async preloadSubmitScripts(): Promise<void> {
    await Promise.all([this.getSubmitViSha(), this.getSubmitEnSha()])
  }

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
    const meta = await container.redis.hgetall(STATE_META_KEY(guildId, mode))
    if (Object.keys(meta).length === 0) {
      return this.migrateLegacyState(guildId, mode)
    }

    const [playersScoreRaw, hintsUsedRaw, usedCountRaw] = await Promise.all([
      container.redis.hgetall(PLAYERS_SCORE_KEY(guildId, mode)),
      container.redis.hgetall(HINTS_USED_KEY(guildId, mode)),
      container.redis.hgetall(USED_COUNT_KEY(guildId, mode))
    ])

    const playersScore: Record<string, number> = {}
    for (const [userId, score] of Object.entries(playersScoreRaw)) {
      playersScore[userId] = Number(score)
    }

    const hintsUsed: Record<string, number> = {}
    for (const [userId, count] of Object.entries(hintsUsedRaw)) {
      hintsUsed[userId] = Number(count)
    }

    const usedWordCountByGroup: Record<string, number> = {}
    for (const [group, count] of Object.entries(usedCountRaw)) {
      usedWordCountByGroup[group] = Number(count)
    }

    return {
      sessionId: meta.sessionId ?? '',
      mode: (meta.mode as WordChainMode) ?? mode,
      startWord: meta.startWord ?? '',
      currentLastWord: meta.currentLastWord ?? '',
      usedWordIndex: {},
      usedWordCountByGroup,
      playersScore,
      hintsUsed,
      lastPlayerId: meta.lastPlayerId || undefined,
      totalWords: Number(meta.totalWords ?? 0),
      status: (meta.status as WordChainState['status']) ?? 'running'
    }
  }

  public static async setState(
    guildId: string,
    mode: WordChainMode,
    state: WordChainState
  ): Promise<void> {
    await this.deleteState(guildId, mode)

    const pipeline = CacheService.pipeline()
    pipeline.hset(STATE_META_KEY(guildId, mode), {
      sessionId: state.sessionId,
      mode: state.mode,
      startWord: state.startWord,
      currentLastWord: state.currentLastWord,
      status: state.status,
      totalWords: state.totalWords.toString(),
      ...(state.lastPlayerId ? { lastPlayerId: state.lastPlayerId } : {})
    })

    if (Object.keys(state.playersScore).length > 0) {
      const mapped: Record<string, string> = {}
      for (const [userId, score] of Object.entries(state.playersScore)) {
        mapped[userId] = score.toString()
      }
      pipeline.hset(PLAYERS_SCORE_KEY(guildId, mode), mapped)
    }

    if (Object.keys(state.hintsUsed).length > 0) {
      const mapped: Record<string, string> = {}
      for (const [userId, count] of Object.entries(state.hintsUsed)) {
        mapped[userId] = count.toString()
      }
      pipeline.hset(HINTS_USED_KEY(guildId, mode), mapped)
    }

    if (Object.keys(state.usedWordCountByGroup).length > 0) {
      const mapped: Record<string, string> = {}
      for (const [group, count] of Object.entries(state.usedWordCountByGroup)) {
        mapped[group] = count.toString()
      }
      pipeline.hset(USED_COUNT_KEY(guildId, mode), mapped)
    }

    for (const [group, index] of Object.entries(state.usedWordIndex)) {
      const words = Object.keys(index)
      if (words.length === 0) continue
      pipeline.sadd(USED_GROUPS_KEY(guildId, mode), group)
      pipeline.sadd(USED_SET_KEY(guildId, mode, group), ...words)
    }

    await pipeline.exec()
  }

  public static async deleteState(
    guildId: string,
    mode: WordChainMode
  ): Promise<void> {
    const groups = await container.redis.smembers(
      USED_GROUPS_KEY(guildId, mode)
    )
    const keysToDelete = [
      STATE_META_KEY(guildId, mode),
      PLAYERS_SCORE_KEY(guildId, mode),
      HINTS_USED_KEY(guildId, mode),
      USED_COUNT_KEY(guildId, mode),
      USED_GROUPS_KEY(guildId, mode),
      LEGACY_STATE_KEY(guildId, mode),
      ...groups.map((group) => USED_SET_KEY(guildId, mode, group))
    ]
    await container.redis.del(...keysToDelete)
  }

  public static async setStatus(
    guildId: string,
    mode: WordChainMode,
    status: 'running' | 'paused'
  ): Promise<boolean> {
    const exists = await container.redis.exists(STATE_META_KEY(guildId, mode))
    if (exists === 1) {
      await container.redis.hset(
        STATE_META_KEY(guildId, mode),
        'status',
        status
      )
      return true
    }

    // Fallback for legacy state
    const legacy = await CacheService.get<LegacyWordChainState>(
      LEGACY_STATE_KEY(guildId, mode)
    )
    if (!legacy) return false
    legacy.status = status
    await this.setState(guildId, mode, legacy as WordChainState)
    return true
  }

  public static async incrementHintUsed(
    guildId: string,
    mode: WordChainMode,
    userId: string
  ): Promise<number> {
    return container.redis.hincrby(HINTS_USED_KEY(guildId, mode), userId, 1)
  }

  public static async isUsedWord(
    guildId: string,
    mode: WordChainMode,
    group: string,
    word: string
  ): Promise<boolean> {
    return CacheService.sismember(USED_SET_KEY(guildId, mode, group), word)
  }

  private static async migrateLegacyState(
    guildId: string,
    mode: WordChainMode
  ): Promise<WordChainState | null> {
    const legacy = await CacheService.get<LegacyWordChainState>(
      LEGACY_STATE_KEY(guildId, mode)
    )
    if (!legacy) return null

    if (!legacy.hintsUsed) legacy.hintsUsed = {}
    if (!legacy.playersScore) legacy.playersScore = {}
    if (!legacy.usedWordIndex) {
      legacy.usedWordIndex = {}
      for (const [group, words] of Object.entries(legacy.usedWords ?? {})) {
        const index: Record<string, true> = {}
        for (const word of words ?? []) index[word] = true
        legacy.usedWordIndex[group] = index
      }
    }
    if (!legacy.usedWordCountByGroup) {
      legacy.usedWordCountByGroup = {}
      for (const [group, index] of Object.entries(legacy.usedWordIndex)) {
        legacy.usedWordCountByGroup[group] = Object.keys(index).length
      }
    }
    if (!legacy.totalWords) legacy.totalWords = 0

    const normalized = legacy as WordChainState
    await this.setState(guildId, mode, normalized)
    await CacheService.delete(LEGACY_STATE_KEY(guildId, mode))
    return normalized
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

  public static async submitVietnameseWord(
    guildId: string,
    userId: string,
    firstWord: string,
    phrase: string,
    lastWord: string
  ): Promise<ViSubmitResult> {
    const result = (await this.evalShaWithFallback(
      () => this.getSubmitViSha(),
      SUBMIT_VI_LUA,
      7,
      STATE_META_KEY(guildId, 'vi'),
      VI_DICTIONARY_KEY(firstWord.toLowerCase()),
      VI_DICTIONARY_KEY(lastWord),
      USED_SET_KEY(guildId, 'vi', firstWord),
      USED_COUNT_KEY(guildId, 'vi'),
      PLAYERS_SCORE_KEY(guildId, 'vi'),
      USED_GROUPS_KEY(guildId, 'vi'),
      userId,
      firstWord,
      phrase,
      lastWord
    )) as [string, string?, string?]

    const code = result[0]

    if (code === 'OK') {
      return {
        status: 'ok',
        totalWords: Number(result[1] ?? 0),
        remainingCount: Number(result[2] ?? 0)
      }
    }

    if (code === 'INVALID_CHAIN') {
      return { status: 'invalid_chain', expected: result[1] ?? '' }
    }

    if (code === 'PAUSED') return { status: 'paused' }
    if (code === 'SAME_PLAYER') return { status: 'same_player' }
    if (code === 'NOT_IN_DICTIONARY') return { status: 'not_in_dictionary' }
    if (code === 'ALREADY_USED') return { status: 'already_used' }
    return { status: 'no_state' }
  }

  public static async submitEnglishWord(
    guildId: string,
    userId: string,
    firstLetter: string,
    word: string,
    lastLetter: string
  ): Promise<EnSubmitResult> {
    const result = (await this.evalShaWithFallback(
      () => this.getSubmitEnSha(),
      SUBMIT_EN_LUA,
      7,
      STATE_META_KEY(guildId, 'en'),
      EN_DICTIONARY_KEY(firstLetter.toLowerCase()),
      EN_DICTIONARY_KEY(lastLetter),
      USED_SET_KEY(guildId, 'en', firstLetter),
      USED_COUNT_KEY(guildId, 'en'),
      PLAYERS_SCORE_KEY(guildId, 'en'),
      USED_GROUPS_KEY(guildId, 'en'),
      userId,
      firstLetter,
      word,
      lastLetter
    )) as [string, string?, string?, string?]

    const code = result[0]

    if (code === 'OK') {
      return {
        status: 'ok',
        totalWords: Number(result[1] ?? 0),
        remainingCount: Number(result[2] ?? 0),
        isRepeat: result[3] === '1'
      }
    }

    if (code === 'INVALID_CHAIN') {
      return { status: 'invalid_chain', expected: result[1] ?? '' }
    }

    if (code === 'PAUSED') return { status: 'paused' }
    if (code === 'NOT_IN_DICTIONARY') return { status: 'not_in_dictionary' }
    return { status: 'no_state' }
  }
}
