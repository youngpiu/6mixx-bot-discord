// Shared repository for managing guild member data
import { container } from '@sapphire/pieces'

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
}
