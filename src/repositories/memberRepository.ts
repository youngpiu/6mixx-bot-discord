import { container } from '@sapphire/pieces'
import { customAlphabet } from 'nanoid'

const generateDonorCode = customAlphabet('0123456789', 4)

export class MemberRepository {
  /**
   * Get or create a member record
   */
  public static async getOrCreate({ guildId, userId }: { guildId: string; userId: string }) {
    return container.prisma.member.upsert({
      where: {
        guildId_userId: { guildId, userId }
      },
      create: { guildId, userId },
      update: {}
    })
  }

  /**
   * Find a member by guildId and userId
   */
  public static async findByUserId({ guildId, userId }: { guildId: string; userId: string }) {
    return container.prisma.member.findUnique({
      where: {
        guildId_userId: { guildId, userId }
      }
    })
  }

  /**
   * Get or create donor code for a member
   */
  public static async getOrCreateDonorCode({
    guildId,
    userId
  }: {
    guildId: string
    userId: string
  }): Promise<string> {
    const member = await this.getOrCreate({ guildId, userId })

    if (member.donorCode) {
      return member.donorCode
    }

    // Generate unique donor code
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

    // Update member with donor code
    await container.prisma.member.update({
      where: { id: member.id },
      data: { donorCode: donorCode! }
    })

    return donorCode!
  }

  /**
   * Get donation stats for a member
   */
  public static async getDonationStats({ guildId, userId }: { guildId: string; userId: string }) {
    const result = await container.prisma.donation.aggregate({
      where: {
        guildId,
        donorId: userId,
        status: 'CONFIRMED'
      },
      _sum: { amount: true },
      _count: true
    })

    return {
      totalAmount: result._sum.amount || 0,
      totalDonations: result._count
    }
  }
}
