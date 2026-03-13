import { container } from '@sapphire/pieces'

import { GuildMemberRepository } from '~/shared/repositories/guildMemberRepository'
import { GuildRepository } from '~/shared/repositories/guildRepository'

export class WordChainRepository {
  /**
   * Create a new word chain session in the database.
   */
  public static async createSession(
    guildId: string,
    channelId: string
  ): Promise<bigint> {
    await GuildRepository.upsert(guildId)
    const session = await container.prisma.wordChainSession.create({
      data: { guildId, channelId }
    })
    return session.id
  }

  /**
   * Bulk save all players' scores at the end of the session.
   */
  public static async saveAllPlayers(
    sessionId: bigint,
    guildId: string,
    playersScore: Record<string, number>
  ): Promise<void> {
    const playerEntries = Object.entries(playersScore)
    if (playerEntries.length === 0) return

    await GuildMemberRepository.createMany(
      playerEntries.map(([userId]) => ({ guildId, userId }))
    )

    await container.prisma.$transaction(
      playerEntries.map(([userId, score]) =>
        container.prisma.wordChainSessionPlayer.upsert({
          where: {
            sessionId_guildId_userId: { sessionId, guildId, userId }
          },
          create: { sessionId, guildId, userId, score },
          update: { score }
        })
      )
    )
  }

  /**
   * Mark the session as ended and set the winner (player with highest score).
   */
  public static async endSession(
    sessionId: bigint,
    winnerId?: string
  ): Promise<void> {
    await container.prisma.wordChainSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date(), winnerId: winnerId ?? null }
    })
  }

  /**
   * Add multiple Vietnamese phrases to the database.
   * Skips duplicates.
   */
  public static async addViPhrases(phrases: string[]): Promise<void> {
    const data = phrases.map((phrase) => {
      const words = phrase.split(/\s+/)
      return {
        phrase,
        firstWord: words[0].toLowerCase(),
        lastWord: words[1].toLowerCase()
      }
    })

    await container.prisma.vietnamesePhrase.createMany({
      data,
      skipDuplicates: true
    })
  }

  /**
   * Add multiple English words to the database.
   * Skips duplicates.
   */
  public static async addEnWords(words: string[]): Promise<void> {
    const data = words.map((word) => ({
      word: word.toLowerCase(),
      firstLetter: word[0].toLowerCase(),
      lastLetter: word[word.length - 1].toLowerCase()
    }))

    await container.prisma.englishWord.createMany({
      data,
      skipDuplicates: true
    })
  }

  /**
   * Retrieves all Vietnamese phrases from the database.
   */
  public static async findAllViPhrases() {
    return container.prisma.vietnamesePhrase.findMany()
  }

  /**
   * Retrieves all English words from the database.
   */
  public static async findAllEnWords() {
    return container.prisma.englishWord.findMany()
  }

  /**
   * Counts the total number of Vietnamese phrases.
   */
  public static async countViPhrases() {
    return container.prisma.vietnamesePhrase.count()
  }

  /**
   * Finds a random Vietnamese phrase using skip.
   */
  public static async findRandomViPhrase(skip: number) {
    return container.prisma.vietnamesePhrase.findFirst({
      skip
    })
  }

  /**
   * Counts the total number of English words.
   */
  public static async countEnWords() {
    return container.prisma.englishWord.count()
  }

  /**
   * Finds a random English word using skip.
   */
  public static async findRandomEnWord(skip: number) {
    return container.prisma.englishWord.findFirst({
      skip
    })
  }
}
