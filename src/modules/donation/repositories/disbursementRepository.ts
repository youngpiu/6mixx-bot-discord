// Repository for managing disbursement records and expense statistics
import { container } from '@sapphire/pieces'

import { CounterRepository } from '~/shared/repositories/counterRepository'

export class DisbursementRepository {
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

    return container.prisma.disbursement.create({
      data: {
        ...data,
        code
      }
    })
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
        code: cleanCode
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
    return container.prisma.disbursement.delete({
      where: { id }
    })
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
    const skip = (page - 1) * limit

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
