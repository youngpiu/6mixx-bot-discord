// Repository for managing disbursement records and expense statistics
import { container } from '@sapphire/pieces'

import { TIME } from '~/shared/constants/timeConstant'
import { CounterRepository } from '~/shared/repositories/counterRepository'
import { CacheService } from '~/shared/services/cacheService'

export class DisbursementRepository {
  private static async invalidateDisbursementCache(guildId: string) {
    await CacheService.invalidatePattern(`disbursements:${guildId}:*`)
  }

  public static async create(data: {
    guildId: string
    amount: number
    description: string
    messageUrl: string
  }) {
    const code = await CounterRepository.generateCode(
      data.guildId,
      'DISBURSEMENT',
      'DSB'
    )

    const disbursement = await container.prisma.disbursement.create({
      data: {
        ...data,
        code
      }
    })

    await this.invalidateDisbursementCache(data.guildId)
    return disbursement
  }
  public static async findById(id: string) {
    return container.prisma.disbursement.findUnique({
      where: { id }
    })
  }

  public static async findByCode(guildId: string, code: string) {
    const cleanCode = code.toUpperCase().replace(/#/g, '')
    return container.prisma.disbursement.findUnique({
      where: {
        guildId_code: { guildId, code: cleanCode }
      }
    })
  }

  public static async findUnique(guildId: string, idOrCode: string) {
    const cleanIdOrCode = idOrCode.toUpperCase().replace(/#/g, '')
    return container.prisma.disbursement.findFirst({
      where: {
        guildId,
        OR: [{ id: idOrCode }, { code: cleanIdOrCode }]
      }
    })
  }

  public static async delete(id: string) {
    const disbursement = await container.prisma.disbursement.delete({
      where: { id }
    })

    await this.invalidateDisbursementCache(disbursement.guildId)
    return disbursement
  }

  public static async findMany({
    guildId,
    page = 1,
    limit = 10
  }: {
    guildId: string
    page?: number
    limit?: number
  }) {
    const cacheKey = `disbursements:${guildId}:${page}:${limit}`
    const skip = (page - 1) * limit

    const result = await CacheService.remember(cacheKey, TIME.S30, async () => {
      const [items, total] = await Promise.all([
        container.prisma.disbursement.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        container.prisma.disbursement.count({
          where: { guildId }
        })
      ])

      const totalPages = Math.ceil(total / limit)
      const hasNext = page < totalPages
      const hasPrev = page > 1

      return {
        items,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNext,
          hasPrev
        }
      }
    })

    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt)
      }))
    }
  }

  public static async searchByCode({
    guildId,
    search
  }: {
    guildId: string
    search: string
  }) {
    const cleanSearch = search.toUpperCase().replace(/#/g, '')
    return container.prisma.disbursement.findMany({
      where: {
        guildId,
        OR: [
          { code: { contains: cleanSearch } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 25
    })
  }

  public static async getStats(guildId: string) {
    const stats = await container.prisma.disbursement.aggregate({
      where: { guildId },
      _sum: { amount: true },
      _count: { id: true }
    })
    return {
      totalAmount: stats._sum.amount ?? 0,
      count: stats._count.id ?? 0
    }
  }
}
