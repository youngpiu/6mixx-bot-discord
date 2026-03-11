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
        guildId_id: {
          guildId: data.guildId,
          id: data.id
        }
      },
      update: {},
      create: data
    })
  }
}
