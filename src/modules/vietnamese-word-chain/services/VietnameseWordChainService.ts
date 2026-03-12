import { container } from '@sapphire/pieces'
import { ContainerBuilder, Guild } from 'discord.js'

import { STATIC_EMOJI } from '~/shared/constants/emojiConstant'
import { VietnameseWordChainRepository } from '~/modules/vietnamese-word-chain/repositories/VietnameseWordChainRepository'
import { VietnameseWordChainRedisService } from '~/modules/vietnamese-word-chain/services/VietnameseWordChainRedisService'

export class VietnameseWordChainService {
  /**
   * Loads the entire vietnamese dictionary from database to Redis.
   * Runs once on bot startup.
   * @param force If true, reload even if already loaded.
   */
  public static async initDictionary(force = false): Promise<void> {
    if (!force) {
      const isLoaded = await VietnameseWordChainRedisService.isDictionaryLoaded()
      if (isLoaded) {
        container.logger.info('[VietnameseWordChainService] Dictionary already loaded in Redis.')
        return
      }
    }

    if (force) {
      await VietnameseWordChainRedisService.clearAllDictionary()
    }
    const phrases = await container.prisma.vietnamesePhrase.findMany()

    // Group phrases by firstWord
    const grouped = new Map<string, string[]>()
    for (const phrase of phrases) {
      const list = grouped.get(phrase.firstWord) ?? []
      list.push(phrase.phrase)
      grouped.set(phrase.firstWord, list)
    }

    // Save to Redis
    for (const [firstWord, words] of grouped.entries()) {
      await VietnameseWordChainRedisService.addPhrasesToDictionary(firstWord, words)
    }

    await VietnameseWordChainRedisService.setDictionaryLoaded()
    container.logger.info(`[VietnameseWordChainService] Successfully loaded ${phrases.length} phrases into Redis.`)
  }

  /**
   * Starts a new game session for a guild.
   * Can be called from command or auto-restart.
   */
  public static async startNewGame(guild: Guild, channelId: string): Promise<boolean> {
    const guildId = guild.id

    // 1. Random a starting phrase from dictionary
    const count = await container.prisma.vietnamesePhrase.count()
    if (count === 0) return false

    const skip = Math.floor(Math.random() * count)
    const startPhrase = await container.prisma.vietnamesePhrase.findFirst({
      skip
    })
    if (!startPhrase) return false

    // 2. Create session in DB
    const sessionId = await VietnameseWordChainRepository.createSession(
      guildId,
      channelId
    )

    // 3. Save state to Redis
    await VietnameseWordChainRedisService.setState(guildId, {
      sessionId: sessionId.toString(),
      startWord: startPhrase.phrase,
      currentLastWord: startPhrase.lastWord,
      usedWords: [startPhrase.phrase],
      playersScore: {},
      hintsUsed: {},
      status: 'running'
    })

    // 4. Send start message to the channel
    const channel = guild.channels.cache.get(channelId)
    if (channel?.isTextBased() && channel.isSendable()) {
      const startContainer = new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(
          [
            `### ${STATIC_EMOJI.VERIFIED} Ván nối từ bắt đầu!`,
            `Từ bắt đầu là: \`${startPhrase.phrase}\``,
            `-# Từ tiếp theo phải bắt đầu bằng: \`${startPhrase.lastWord}\``
          ].join('\n')
        )
      )

      await channel.send({
        components: [startContainer],
        flags: ['IsComponentsV2']
      })
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
    sessionId: string,
    playersScore: Record<string, number>,
    options: { isManualReset?: boolean; reason?: string } = {}
  ) {
    const guildId = guild.id

    // 1. Delete Redis state first to prevent further processing
    await VietnameseWordChainRedisService.deleteState(guildId)

    // 2. Sort players by score DESC
    const sorted = Object.entries(playersScore).sort(([, a], [, b]) => b - a)

    // 3. Bulk fetch members to avoid rate limits for leaderboard
    const userIds = sorted.map(([id]) => id)
    const members = await guild.members.fetch({ user: userIds }).catch(() => null)

    const medals = ['🥇', '🥈', '🥉']
    const leaderboardLines = sorted.map(([userId, score], index) => {
      const rank = medals[index] ?? `**${index + 1}.**`
      const member = members?.get(userId)
      const displayName = member?.displayName ?? `<@${userId}>`
      return `${rank} ${displayName} — **${score}** từ`
    })

    const winnerId = sorted[0]?.[0]

    // 4. Save results to DB
    await VietnameseWordChainRepository.saveAllPlayers(
      BigInt(sessionId),
      guildId,
      playersScore
    ).catch(() => null)

    await VietnameseWordChainRepository.endSession(BigInt(sessionId), winnerId).catch(
      () => null
    )

    // 5. Send leaderboard to channel
    const channel = guild.channels.cache.get(channelId)
    if (channel?.isTextBased() && channel.isSendable()) {
      const endContainer = new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(
          [
            `### 🏆 Kết thúc ván nối từ${options.isManualReset ? ' (ADMIN Reset)' : ''}`,
            options.reason ? `-# ${options.reason}` : '-# Không còn từ nào có thể nối tiếp.',
            '',
            ...(leaderboardLines.length > 0 ? leaderboardLines : ['_Chưa có người chơi nào._'])
          ].join('\n')
        )
      )

      await channel.send({
        components: [endContainer],
        flags: ['IsComponentsV2']
      })
    }

    // 6. Auto-restart after 5 seconds IF NOT a manual reset
    if (!options.isManualReset) {
      setTimeout(async () => {
        try {
          const { SettingRepository } = await import('~/shared/repositories/settingRepository')
          const freshSetting = await SettingRepository.find(guildId)
          if (freshSetting?.wordChainChannelId) {
            await this.startNewGame(guild, freshSetting.wordChainChannelId)
          }
        } catch (error) {
          container.logger.error('[VietnameseWordChainService] Auto-restart failed:', error)
        }
      }, 5000)
    }
  }
}
