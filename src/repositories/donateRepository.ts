import { container } from '@sapphire/pieces'
import { customAlphabet } from 'nanoid'

import { MemberRepository } from '~/repositories/memberRepository'

const generateNanoId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6)

export class DonateRepository {
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

  public static async upsertConfig({
    guildId,
    notificationChannelId
  }: {
    guildId: string
    notificationChannelId: string | null
  }) {
    return container.prisma.donationConfig.upsert({
      where: { guildId },
      create: { guildId, notificationChannelId },
      update: { notificationChannelId }
    })
  }

  public static async getConfig(guildId: string) {
    return container.prisma.donationConfig.findUnique({
      where: { guildId }
    })
  }

  public static async confirmDonation({
    code,
    guildId,
    confirmedBy
  }: {
    code: string
    guildId: string
    confirmedBy: string
  }) {
    // Ensure confirmer member exists
    await MemberRepository.getOrCreate({ guildId, userId: confirmedBy })

    return container.prisma.donation.update({
      where: { code },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedBy
      },
      include: {
        donor: true
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
    status?: 'PENDING' | 'CONFIRMED'
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
          status: 'CONFIRMED'
        },
        _sum: { amount: true },
        _count: true
      }),
      container.prisma.donation.findMany({
        where: {
          guildId,
          status: 'CONFIRMED'
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
