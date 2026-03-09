// Repository for managing donation records and statistics in the database
import { container } from '@sapphire/pieces'
import { customAlphabet } from 'nanoid'

import { DonationStatus } from 'generated/prisma/enums'
import type { DonationUncheckedCreateInput } from 'generated/prisma/models/Donation'

const generateNanoId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 9)

export class DonateRepository {
  public static async create(data: Omit<DonationUncheckedCreateInput, 'code'>) {
    let retries = 3

    while (retries > 0) {
      try {
        const code = `DNT_${generateNanoId()}`

        return await container.prisma.donation.create({
          data: {
            ...data,
            code
          },
          include: {
            donor: true
          }
        })
      } catch (error: unknown) {
        // Unique constraint failed on the fields: (`code`) (Prisma error P2002)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any).code === 'P2002') {
          retries--
          continue
        }
        return null
      }
    }

    return null
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

  public static async updateStatus(id: string, status: DonationStatus) {
    return container.prisma.donation.update({
      where: { id },
      data: {
        status,
        confirmedAt:
          status === DonationStatus.TRANSFERRED ? new Date() : undefined
      }
    })
  }

  public static async deleteOld(days = 3) {
    const expiredTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    return container.prisma.donation.deleteMany({
      where: {
        status: {
          in: ['PENDING', 'CANCELED']
        },
        updatedAt: {
          lt: expiredTime
        }
      }
    })
  }

  public static async searchByCode({
    guildId,
    search
  }: {
    guildId: string
    search: string
  }) {
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

  public static async findMany({
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
      container.prisma.donation.groupBy({
        by: ['donorId'],
        where: {
          guildId,
          status: 'TRANSFERRED'
        }
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
