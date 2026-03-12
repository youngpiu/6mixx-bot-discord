import { container } from '@sapphire/pieces'

import { GuildRepository } from '~/shared/repositories/guildRepository'
import { MemberRepository } from '~/shared/repositories/memberRepository'

export class VietnameseWordChainRepository {
  /**
   * Create a new word chain session in the database.
   * Accessor: vietnameseWordChainSeasion (generated name — typo in schema)
   */
  public static async createSession(
    guildId: string,
    channelId: string
  ): Promise<bigint> {
    await GuildRepository.upsert(guildId)
    const session = await container.prisma.vietnameseWordChainSession.create({
      data: { guildId, channelId }
    })
    return session.id
  }

  /**
   * Upsert a player's score for the current session.
   * Accessor: wordChainPlayer (generated name)
   */
  public static async upsertPlayer(
    sessionId: bigint,
    guildId: string,
    memberId: string,
    score: number
  ): Promise<void> {
    await MemberRepository.create({ guildId, id: memberId })
    await container.prisma.vietnameseWordChainSessionPlayer.upsert({
      where: { sessionId_guildId_memberId: { sessionId, guildId, memberId } },
      create: { sessionId, guildId, memberId, score },
      update: { score }
    })
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

    await MemberRepository.createMany(
      playerEntries.map(([memberId]) => ({ guildId, id: memberId }))
    )

    await container.prisma.$transaction(
      playerEntries.map(([memberId, score]) =>
        container.prisma.vietnameseWordChainSessionPlayer.upsert({
          where: { sessionId_guildId_memberId: { sessionId, guildId, memberId } },
          create: { sessionId, guildId, memberId, score },
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
    await container.prisma.vietnameseWordChainSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date(), winnerId: winnerId ?? null }
    })
  }

  /**
   * Add multiple phrases to the database.
   * Skips duplicates.
   */
  public static async addPhrases(phrases: string[]): Promise<void> {
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
}
