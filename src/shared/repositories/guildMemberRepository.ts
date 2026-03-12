// Shared repository for managing guild member data
import { container } from '@sapphire/pieces'

import { Prisma } from 'generated/prisma/client'

export class GuildMemberRepository {
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
