import { container } from '@sapphire/pieces'

export class MemberRepository {
  public static async createMembers(data: { guildId: string; userId: string }[]) {
    return container.prisma.member.createMany({
      data,
      skipDuplicates: true
    })
  }

  public static async createMember({ guildId, userId }: { guildId: string; userId: string }) {
    return container.prisma.member.upsert({
      where: {
        guildId_userId: { guildId, userId }
      },
      update: {}, // No updates needed, just ensure the record exists
      create: { guildId, userId }
    })
  }

  public static async findByUserId({ guildId, userId }: { guildId: string; userId: string }) {
    return container.prisma.member.findUnique({
      where: {
        guildId_userId: { guildId, userId }
      }
    })
  }
}
