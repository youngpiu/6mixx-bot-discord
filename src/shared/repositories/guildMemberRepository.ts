// Shared repository for managing guild member data
import { container } from '@sapphire/pieces'
import type { Client } from 'discord.js'

import { Prisma } from 'generated/prisma/client'

/**
 * Repository for managing guild member records and their associated user records in the database.
 */
export class GuildMemberRepository {
  /**
   * Creates multiple guild member records in bulk.
   * Also ensures associated User records exist before creating members to satisfy foreign key constraints.
   *
   * @param data - An array of guild member data to insert.
   * @returns A promise resolving to the count of records created.
   */
  public static async createMany(data: Prisma.GuildMemberCreateManyInput[]) {
    if (data.length === 0) return { count: 0 }

    const userIds = Array.from(new Set(data.map((item) => item.userId)))

    await container.prisma.user.createMany({
      data: userIds.map((id) => ({ id })),
      skipDuplicates: true
    })

    return container.prisma.guildMember.createMany({
      data,
      skipDuplicates: true
    })
  }

  /**
   * Creates or ensures existence of a single guild member and its associated user.
   * Uses an upsert to prevent duplication if the record already exists.
   *
   * @param data - The guild member data to create or ensure.
   * @returns A promise resolving to the created or updated guild member.
   */
  public static async create(data: Prisma.GuildMemberUncheckedCreateInput) {
    await container.prisma.user.upsert({
      where: { id: data.userId },
      update: {},
      create: { id: data.userId }
    })

    return container.prisma.guildMember.upsert({
      where: {
        guildId_userId: {
          guildId: data.guildId,
          userId: data.userId
        }
      },
      update: {},
      create: data
    })
  }

  /**
   * Syncs all non-bot members across all guilds the bot is in.
   * Used at startup to catch any members who joined while the bot was offline.
   *
   * @param client - The connected Discord client.
   */
  public static async syncAllGuilds(client: Client<true>) {
    for (const guild of client.guilds.cache.values()) {
      const members = await guild.members.fetch()

      const data = members
        .filter((m) => !m.user.bot)
        .map((m) => ({ guildId: guild.id, userId: m.id }))

      const result = await this.createMany(data)

      container.logger.info(
        `[Ready] Synced ${result.count} members for guild ${guild.name}`
      )
    }
  }
}
