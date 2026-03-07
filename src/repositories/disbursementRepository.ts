import { container } from '@sapphire/pieces'

import { DonationStatus } from 'generated/prisma/enums'

export class DisbursementRepository {
  /**
   * Get available budget (total TRANSFERRED donations - total disbursements)
   */
  public static async getAvailableBudget(guildId: string): Promise<number> {
    const [totalDonations, totalDisbursements] = await Promise.all([
      container.prisma.donation.aggregate({
        where: {
          guildId,
          status: DonationStatus.TRANSFERRED
        },
        _sum: {
          amount: true
        }
      }),
      container.prisma.disbursement.aggregate({
        where: {
          guildId
        },
        _sum: {
          amount: true
        }
      })
    ])

    const donationsTotal = totalDonations._sum.amount || 0
    const disbursementsTotal = totalDisbursements._sum.amount || 0

    return donationsTotal - disbursementsTotal
  }

  /**
   * Create a new disbursement
   */
  public static async create({
    guildId,
    amount,
    description,
    createdBy
  }: {
    guildId: string
    amount: number
    description: string
    createdBy: string
  }) {
    return container.prisma.disbursement.create({
      data: {
        guildId,
        amount,
        description,
        createdBy
      },
      include: {
        creator: true
      }
    })
  }

  /**
   * Get disbursements with pagination
   */
  public static async getDisbursements({
    guildId,
    page = 1,
    limit = 10
  }: {
    guildId: string
    page: number
    limit: number
  }) {
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      container.prisma.disbursement.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          creator: true
        }
      }),
      container.prisma.disbursement.count({
        where: { guildId }
      })
    ])

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  public static async getStats(guildId: string) {
    const [count, totalAmount] = await Promise.all([
      container.prisma.disbursement.count({
        where: { guildId }
      }),
      container.prisma.disbursement.aggregate({
        where: { guildId },
        _sum: { amount: true }
      })
    ])

    return {
      count,
      totalAmount: totalAmount._sum.amount || 0
    }
  }
}
