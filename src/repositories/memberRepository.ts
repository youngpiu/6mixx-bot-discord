import { container } from '@sapphire/pieces'
import { customAlphabet } from 'nanoid'

const generateDonorCode = customAlphabet('0123456789', 4)

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

  public static async getOrCreateDonorCode({
    guildId,
    userId
  }: {
    guildId: string
    userId: string
  }): Promise<string> {
    const member = await this.findByUserId({ guildId, userId })
    if (!member) {
      throw new Error('Member not found')
    }

    if (member.donorCode) {
      return member.donorCode
    }

    let donorCode: string
    let exists = true

    while (exists) {
      donorCode = `D${generateDonorCode()}`
      const existing = await container.prisma.member.findFirst({
        where: { guildId, donorCode },
        select: { id: true }
      })
      exists = !!existing
    }

    await container.prisma.member.update({
      where: { id: member.id },
      data: { donorCode: donorCode! }
    })

    return donorCode!
  }
}
