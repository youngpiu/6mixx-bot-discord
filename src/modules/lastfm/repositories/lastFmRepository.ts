import { container } from '@sapphire/pieces'

/**
 * Repository for managing Last.fm related data.
 */
export class LastFmRepository {
  /**
   * Finds the Last.fm account for a user.
   */
  public static async findAccount(userId: string) {
    return container.prisma.lastFmAccount.findUnique({
      where: { userId }
    })
  }

  /**
   * Links a Last.fm username to a Discord user.
   */
  public static async upsertAccount(userId: string, lastfmUsername: string) {
    return container.prisma.lastFmAccount.upsert({
      where: { userId },
      create: { userId, lastfmUsername },
      update: { lastfmUsername }
    })
  }

  /**
   * Updates the total scrobbles for an account.
   */
  public static async updateTotalScrobbles(
    userId: string,
    totalScrobbles: number
  ) {
    return container.prisma.lastFmAccount.update({
      where: { userId },
      data: { totalScrobbles }
    })
  }

  /**
   * Gets all members in a guild who have linked their Last.fm account and are not blacklisted.
   */
  public static async getGuildFmMembers(guildId: string) {
    return container.prisma.lastFmAccount.findMany({
      where: {
        user: {
          guildMembers: {
            some: {
              guildId
            }
          }
        }
      },
      include: {
        user: true
      }
    })
  }

  /**
   * Upserts a user's playcount for a specific artist in the library.
   */
  public static async upsertUserArtistLibrary(
    userId: string,
    artistName: string,
    playCount: number
  ) {
    return container.prisma.lastFmUserArtistLibrary.upsert({
      where: { userId_artistName: { userId, artistName } },
      create: { userId, artistName, playCount },
      update: { playCount }
    })
  }

  /**
   * Gets whoknows leaderboard for an artist from the local library.
   */
  public static async getWhoknowsFromLibrary(
    guildId: string,
    artistName: string
  ) {
    const normalizedArtist = artistName.toLowerCase()
    return container.prisma.$queryRaw<{ userId: string; playCount: number }[]>`
      SELECT lib."userId", lib."playCount"
      FROM "LastFmUserArtistLibrary" lib
      INNER JOIN "GuildMember" gm ON lib."userId" = gm."userId" AND gm."guildId" = ${guildId}
      WHERE LOWER(lib."artistName") = ${normalizedArtist}
        AND lib."playCount" > 0
      ORDER BY lib."playCount" DESC
    `
  }

  /**
   * Gets the date when a user's library was last updated.
   */
  public static async getLibraryLastUpdated(
    userId: string
  ): Promise<Date | null> {
    const result = await container.prisma.lastFmUserArtistLibrary.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true }
    })
    return result?.updatedAt ?? null
  }
}
