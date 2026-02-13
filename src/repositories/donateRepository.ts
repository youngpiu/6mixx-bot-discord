import { container } from '@sapphire/pieces'
import { customAlphabet } from 'nanoid'

import { DonationStatus } from 'generated/prisma/enums'

const generateNanoId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 3)

export class DonateRepository {
  public static async createDonation(data: {
    guildId: string
    donorId: string
    amount: number
    message?: string
  }) {
    let retries = 3

    while (retries > 0) {
      try {
        const code = `DNT_${generateNanoId()}`

        return await container.prisma.donation.create({
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
      } catch (error: any) {
        // P2002: Unique constraint failed on the fields: (`code`)
        if (error.code === 'P2002') {
          retries--
          continue
        }
        throw error
      }
    }

    throw new Error('Failed to generate unique donation code after 3 retries')
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

  public static async markAsTransferred({
    donationId,
    confirmedBy
  }: {
    donationId: string
    confirmedBy: string
  }) {
    return container.prisma.donation.update({
      where: { id: donationId },
      data: {
        status: 'TRANSFERRED',
        confirmedAt: new Date(),
        confirmedBy
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
    // Ensure confirmer member exists in database
    // Member record is expected to exist via join release

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
      where: { id },
      data: {
        status: 'CANCELED'
      }
    })
  }

  public static async searchByCode({ guildId, search }: { guildId: string; search: string }) {
    return container.prisma.donation.findMany({
      where: {
        guildId,
        code: { contains: search.toUpperCase() }
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
    status?: DonationStatus
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

  public static async getTopDonors(guildId: string, limit = 5) {
    const donors = await container.prisma.donation.groupBy({
      by: ['donorId'],
      where: {
        guildId,
        status: 'TRANSFERRED'
      },
      _sum: {
        amount: true
      },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: limit
    })

    return donors.map((d) => ({
      donorId: d.donorId,
      totalAmount: d._sum.amount || 0
    }))
  }
}
