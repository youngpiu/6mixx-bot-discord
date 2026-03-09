// Repository for managing disbursement records and expense statistics
import { container } from '@sapphire/pieces'

export class DisbursementRepository {
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
