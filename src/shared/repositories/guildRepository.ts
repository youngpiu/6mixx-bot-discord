import { container } from '@sapphire/pieces'

/**
 * Repository for managing base Guild records in the database.
 */
export class GuildRepository {
  /**
   * Ensures a guild record exists in the database.
   * If the guild doesn't exist, it is created; otherwise, it is returned as-is.
   *
   * @param guildId - The Discord Snowlake ID of the guild.
   * @returns A promise resolving to the upserted guild record.
   */
  public static async upsert(guildId: string) {
    return container.prisma.guild.upsert({
      where: { id: guildId },
      create: { id: guildId },
      update: {}
    })
  }
}
