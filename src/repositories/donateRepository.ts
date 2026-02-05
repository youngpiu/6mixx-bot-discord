import { container } from '@sapphire/pieces'
import { customAlphabet } from 'nanoid'

import { GuildRepository } from '~/repositories/guildRepository'
import { MemberRepository } from '~/repositories/memberRepository'

const generateNanoId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6)

export class DonateRepository {
  public static async getConfig(guildId: string) {
    return GuildRepository.getDonationConfig(guildId)
  }

  public static async updateConfig(
    guildId: string,
    data: {
      donationTutorialThreadId?: string
      donationNotificationThreadId?: string
    }
  ) {
    return GuildRepository.updateDonationConfig(guildId, data)
  }

  private static async generateDonationCode(): Promise<string> {
    let code: string
    let exists = true

    while (exists) {
      code = `DNT${generateNanoId()}`
      const existing = await container.prisma.donation.findUnique({
        where: { code },
        select: { id: true }
      })
      exists = !!existing
    }

    return code!
  }

  public static async createDonation(data: {
    guildId: string
    donorId: string
    amount: number
    message?: string
  }) {
    const code = await this.generateDonationCode()

    // Ensure member exists and has donorCode
    await MemberRepository.getOrCreateDonorCode({
      guildId: data.guildId,
      userId: data.donorId
    })

    return container.prisma.donation.create({
      data: {
        code,
        guildId: data.guildId,
        donorId: data.donorId,
        amount: data.amount,
        message: data.message
      },
      include: {
        donor: true
      }
    })
  }

  public static async findByCode(code: string) {
    return container.prisma.donation.findUnique({
      where: { code },
      include: {
        donor: true
      }
    })
  }

  public static async findById(id: string) {
    return container.prisma.donation.findUnique({
      where: { id },
      include: {
        donor: true
      }
    })
  }

  public static async markAsPendingVerification(id: string) {
    return container.prisma.donation.update({
      where: { id, status: 'PENDING' },
      data: {
        status: 'PENDING_VERIFICATION'
      }
    })
  }

  public static async confirmDonation({
    code,
    confirmedBy
  }: {
    code: string
    confirmedBy: string
  }) {
    // Ensure confirmer member exists
    // Member should exist from join sync

    return container.prisma.donation.update({
      where: { code },
      data: {
        status: 'TRANSFERRED',
        confirmedAt: new Date(),
        confirmedBy
      },
      include: {
        donor: true
      }
    })
  }

  public static async cancelDonation(id: string) {
    return container.prisma.donation.update({
      where: { id, status: 'PENDING' },
      data: {
        status: 'CANCELED'
      }
    })
  }

  public static async searchByCode({ guildId, search }: { guildId: string; search: string }) {
    return container.prisma.donation.findMany({
      where: {
        guildId,
        code: { contains: search.toUpperCase() },
        status: 'PENDING'
      },
      include: {
        donor: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  }

  public static async getDonations({
    guildId,
    page = 1,
    limit = 10,
    status
  }: {
    guildId: string
    page: number
    limit: number
    status?: 'PENDING' | 'TRANSFERRED'
  }) {
    const skip = (page - 1) * limit

    const whereClause = {
      guildId,
      status
    }

    const [items, total] = await Promise.all([
      container.prisma.donation.findMany({
        where: whereClause,
        include: {
          donor: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),

      container.prisma.donation.count({
        where: whereClause
      })
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      items,
      meta: {
        total,
        totalPages,
        page,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        status
      }
    }
  }

  public static async getStats(guildId: string) {
    const [aggregate, uniqueDonors] = await Promise.all([
      container.prisma.donation.aggregate({
        where: {
          guildId,
          status: 'TRANSFERRED'
        },
        _sum: { amount: true },
        _count: true
      }),
      container.prisma.donation.findMany({
        where: {
          guildId,
          status: 'TRANSFERRED'
        },
        distinct: ['donorId'],
        select: { donorId: true }
      })
    ])

    return {
      totalAmount: aggregate._sum.amount || 0,
      totalTransactions: aggregate._count,
      uniqueDonors: uniqueDonors.length
    }
  }
}
