// Shared repository for managing member-specific data
import { container } from '@sapphire/pieces'

import { Prisma } from 'generated/prisma/client'

export class MemberRepository {
  public static async createMany(data: Prisma.MemberCreateManyInput[]) {
    return container.prisma.member.createMany({
      data,
      skipDuplicates: true
    })
  }

  public static async create(data: Prisma.MemberUncheckedCreateInput) {
    return container.prisma.member.upsert({
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
