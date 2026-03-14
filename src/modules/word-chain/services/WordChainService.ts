import { container } from '@sapphire/pieces'
import { ContainerBuilder, Guild } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'
import { MessageUtil } from '~/shared/utils/messageUtil'

import { WordChainRepository } from '~/modules/word-chain/repositories/WordChainRepository'
import {
  type WordChainMode,
  WordChainRedisService
} from '~/modules/word-chain/services/WordChainRedisService'

export class WordChainService {
  /**
   * Loads the dictionary for the specified mode from database to Redis.
   */
  private static async initDictionary(
    mode: WordChainMode,
    force = false
  ): Promise<void> {
    const isVi = mode === 'vi'

    if (!force) {
      const isLoaded = isVi
        ? await WordChainRedisService.isViDictionaryLoaded()
        : await WordChainRedisService.isEnDictionaryLoaded()
      if (isLoaded) {
        container.logger.info(
          `[WordChainService] ${isVi ? 'Vietnamese' : 'English'} dictionary already loaded in Redis.`
        )
        return
      }
    }

    if (force) {
      if (isVi) await WordChainRedisService.clearAllViDictionary()
      else await WordChainRedisService.clearAllEnDictionary()
    }

    const grouped = new Map<string, string[]>()
    let totalCount = 0

    if (isVi) {
      const phrases = await WordChainRepository.findAllViPhrases()
      totalCount = phrases.length
      for (const p of phrases) {
        const list = grouped.get(p.firstWord) ?? []
        list.push(p.phrase)
        grouped.set(p.firstWord, list)
      }
    } else {
      const words = await WordChainRepository.findAllEnWords()
      totalCount = words.length
      for (const w of words) {
        const list = grouped.get(w.firstLetter) ?? []
        list.push(w.word)
        grouped.set(w.firstLetter, list)
      }
    }

    // Save to Redis
    for (const [key, list] of grouped.entries()) {
      if (isVi) await WordChainRedisService.addViPhrasesToDictionary(key, list)
      else await WordChainRedisService.addEnWordsToDictionary(key, list)
    }

    if (totalCount > 0) {
      if (isVi) await WordChainRedisService.setViDictionaryLoaded()
      else await WordChainRedisService.setEnDictionaryLoaded()
    }

    container.logger.info(
      `[WordChainService] Successfully loaded ${totalCount} ${isVi ? 'Vietnamese' : 'English'} phrases/words into Redis.`
    )
  }

  public static async initViDictionary(force = false): Promise<void> {
    return this.initDictionary('vi', force)
  }

  public static async initEnDictionary(force = false): Promise<void> {
    return this.initDictionary('en', force)
  }

  /**
   * Starts a new game session for a guild.
   */
  public static async startNewGame(
    guild: Guild,
    channelId: string,
    mode: WordChainMode
  ): Promise<boolean> {
    const guildId = guild.id

    let startWord: string
    let currentLastWord: string
    let usedWordGroupKey: string // firstWord (vi) or firstLetter (en)

    if (mode === 'vi') {
      const count = await WordChainRepository.countViPhrases()
      if (count === 0) return false

      // Retry until we find a start phrase whose lastWord has continuations
      const MAX_START_ATTEMPTS = 20
      let startPhrase: Awaited<
        ReturnType<typeof WordChainRepository.findRandomViPhrase>
      > = null
      for (let i = 0; i < MAX_START_ATTEMPTS; i++) {
        const skip = Math.floor(Math.random() * count)
        const candidate = await WordChainRepository.findRandomViPhrase(skip)
        if (!candidate) continue
        const continuations = await WordChainRedisService.countViStartingWith(
          candidate.lastWord
        )
        if (continuations > 0) {
          startPhrase = candidate
          break
        }
      }
      if (!startPhrase) return false

      startWord = startPhrase.phrase
      currentLastWord = startPhrase.lastWord
      usedWordGroupKey = startPhrase.firstWord
    } else {
      const count = await WordChainRepository.countEnWords()
      if (count === 0) return false

      const skip = Math.floor(Math.random() * count)
      const word = await WordChainRepository.findRandomEnWord(skip)
      if (!word) return false

      startWord = word.word
      currentLastWord = word.lastLetter
      usedWordGroupKey = word.firstLetter
    }

    // Create session in DB
    const sessionId = await WordChainRepository.createSession(
      guildId,
      channelId
    )

    // Save state to Redis
    await WordChainRedisService.setState(guildId, mode, {
      sessionId: sessionId.toString(),
      mode,
      startWord,
      currentLastWord,
      usedWordIndex: { [usedWordGroupKey]: { [startWord]: true } },
      usedWordCountByGroup: { [usedWordGroupKey]: 1 },
      playersScore: {},
      hintsUsed: {},
      totalWords: 0,
      status: 'running'
    })

    // Send start message to the channel
    const channel = guild.channels.cache.get(channelId)
    const content = `Từ bắt đầu là: \`${startWord}\`.`

    if (channel?.isTextBased()) {
      await MessageUtil.sendWithContainer(channel, content)
    }

    return true
  }

  /**
   * Ends the current game session, saves scores, displays leaderboard,
   * and optionally schedules an auto-restart.
   */
  public static async endGame(
    guild: Guild,
    channelId: string,
    mode: WordChainMode,
    sessionId: string,
    playersScore: Record<string, number>,
    options: { isManualReset?: boolean; reason?: string } = {}
  ) {
    const guildId = guild.id

    // 1. Delete Redis state first to prevent further processing
    await WordChainRedisService.deleteState(guildId, mode)

    // 2. Sort players by score DESC
    const sorted = Object.entries(playersScore).sort(([, a], [, b]) => b - a)

    const wordUnit = 'từ'
    const leaderboardLines = sorted.map(([userId, score], index) => {
      const displayName = `<@${userId}>`
      return `**${index + 1}.** ${displayName} - **${score}** ${wordUnit}`
    })

    // 4. Save results to DB
    await WordChainRepository.saveAllPlayers(
      BigInt(sessionId),
      guildId,
      playersScore
    ).catch(() => null)

    await WordChainRepository.endSession(
      BigInt(sessionId),
      sorted[0]?.[0]
    ).catch(() => null)

    // 5. Send leaderboard to channel
    const channel = guild.channels.cache.get(channelId)
    const endTitle = `### Kết thúc ván nối từ`

    const noPlayersMsg = '_Chưa có người chơi nào._'

    const endContainer = new ContainerBuilder()
      .addTextDisplayComponents((t) => t.setContent(endTitle))
      .addSeparatorComponents((s) => s)
      .addTextDisplayComponents((t) =>
        t.setContent(
          [
            ...(leaderboardLines.length > 0 ? leaderboardLines : [noPlayersMsg])
          ].join('\n')
        )
      )

    if (channel?.isTextBased()) {
      await MessageUtil.sendWithContainer(channel, endContainer)
    }

    // 6. Auto-restart after 5 seconds IF NOT a manual reset
    if (!options.isManualReset) {
      setTimeout(async () => {
        try {
          const freshSetting = await SettingRepository.find(guildId)
          const channelId =
            mode === 'vi'
              ? freshSetting?.vietnameseWordChainChannelId
              : freshSetting?.englishWordChainChannelId
          if (channelId) {
            await this.startNewGame(guild, channelId, mode)
          }
        } catch (error) {
          container.logger.error(
            '[WordChainService] Auto-restart failed:',
            error
          )
        }
      }, 5000)
    }
  }
}
