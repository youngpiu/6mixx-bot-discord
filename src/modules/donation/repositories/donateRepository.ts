// Repository for managing donation records and statistics in the database
import { container } from '@sapphire/pieces'

import { DonationStatus } from 'generated/prisma/enums'
import type { DonationUncheckedCreateInput } from 'generated/prisma/models/Donation'

import { TIME } from '~/shared/constants/timeConstant'
import { CounterRepository } from '~/shared/repositories/counterRepository'
import { CacheService } from '~/shared/services/cacheService'

export class DonateRepository {
  private static async invalidateDonationCache(guildId: string) {
    await CacheService.invalidatePattern(`donations:${guildId}:*`)
  }

  public static async create(data: Omit<DonationUncheckedCreateInput, 'code'>) {
    let retries = 3

    while (retries > 0) {
      try {
        const code = await CounterRepository.generateCode(
          data.guildId,
          'DONATION',
          'DNT'
        )

        const donation = await container.prisma.donation.create({
          data: {
            ...data,
            code
          },
          include: {
            donor: true
          }
        })

        await this.invalidateDonationCache(data.guildId)
        return donation
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
    const cleanCode = code.replace(/#/g, '')
    return container.prisma.donation.findUnique({
      where: { code: cleanCode },
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
    const donation = await container.prisma.donation.update({
      where: { id },
      data: {
        status,
        confirmedAt:
          status === DonationStatus.TRANSFERRED ? new Date() : undefined
      }
    })
    await this.invalidateDonationCache(donation.guildId)
    return donation
  }

  public static async deleteOld(days = 3) {
    const expiredTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Find guilds affected by deletion to invalidate their caches
    const affectedDonations = await container.prisma.donation.findMany({
      where: {
        status: { in: ['PENDING', 'CANCELED'] },
        updatedAt: { lt: expiredTime }
      },
      select: { guildId: true },
      distinct: ['guildId']
    })

    const result = await container.prisma.donation.deleteMany({
      where: {
        status: {
          in: ['PENDING', 'CANCELED']
        },
        updatedAt: {
          lt: expiredTime
        }
      }
    })

    // Invalidate caches for all affected guilds
    for (const { guildId } of affectedDonations) {
      await this.invalidateDonationCache(guildId)
    }

    return result
  }

  public static async searchByCode({
    guildId,
    search
  }: {
    guildId: string
    search: string
  }) {
    const cleanSearch = search.replace(/#/g, '').toUpperCase()
    return container.prisma.donation.findMany({
      where: {
        guildId,
        code: { contains: cleanSearch }
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
    const cacheKey = `donations:${guildId}:${page}:${limit}:${status || '*'}`
    const skip = (page - 1) * limit

    const whereClause = {
      guildId,
      status
    }

    const result = await CacheService.remember(cacheKey, TIME.S30, async () => {
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
    })

    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        confirmedAt: item.confirmedAt ? new Date(item.confirmedAt) : null,
        donor: {
          ...item.donor,
          createdAt: new Date(item.donor.createdAt),
          updatedAt: new Date(item.donor.updatedAt)
        }
      }))
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
