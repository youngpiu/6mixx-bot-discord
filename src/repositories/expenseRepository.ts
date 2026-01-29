import { container } from '@sapphire/pieces'
import { nanoid } from 'nanoid'

import { MemberRepository } from '~/repositories/memberRepository'

const CODE_PREFIX = 'EXP'
const CODE_LENGTH = 6

interface CreateExpenseInput {
  guildId: string
  amount: number
  description: string
  createdBy: string
}

interface GetExpensesInput {
  guildId: string
  page?: number
  limit?: number
}

export class ExpenseRepository {
  public static async createExpense(data: CreateExpenseInput) {
    // Ensure member exists
    await MemberRepository.getOrCreate({
      guildId: data.guildId,
      userId: data.createdBy
    })

    const code = `${CODE_PREFIX}${nanoid(CODE_LENGTH).toUpperCase()}`

    return container.prisma.expense.create({
      data: {
        code,
        guildId: data.guildId,
        amount: data.amount,
        description: data.description,
        createdBy: data.createdBy
      },
      include: {
        creator: true
      }
    })
  }

  public static async getExpenses({ guildId, page = 1, limit = 5 }: GetExpensesInput) {
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      container.prisma.expense.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { creator: true }
      }),
      container.prisma.expense.count({ where: { guildId } })
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  }

  public static async getStats(guildId: string) {
    const result = await container.prisma.expense.aggregate({
      where: { guildId },
      _sum: { amount: true },
      _count: { id: true }
    })

    return {
      totalAmount: result._sum.amount || 0,
      totalTransactions: result._count.id
    }
  }
}
