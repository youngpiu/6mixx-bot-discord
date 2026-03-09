import { container } from '@sapphire/pieces'

export class DisbursementRepository {
  public static async createDisbursement(data: {
    guildId: string
    amount: number
    description: string
    attachmentUrls: string[]
    messageUrl?: string
  }) {
    return container.prisma.disbursement.create({
      data
    })
  }

  public static async getDisbursements({
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

  public static async deleteDisbursement(id: string) {
    return container.prisma.disbursement.delete({
      where: { id }
    })
  }

  public static async searchDisbursements(guildId: string, query: string) {
    const disbursements = await container.prisma.disbursement.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    if (!query) return disbursements.slice(0, 25)

    const q = query.toLowerCase()
    return disbursements
      .filter((d) => {
        const dateStr = new Date(d.createdAt).toLocaleDateString('vi-VN')
        const amountStr = d.amount.toString()
        const description = d.description.toLowerCase()

        return dateStr.includes(q) || amountStr.includes(q) || description.includes(q)
      })
      .slice(0, 25)
  }
}
