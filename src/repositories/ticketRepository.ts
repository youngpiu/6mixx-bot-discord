import { container } from '@sapphire/pieces'

import { Prisma, Ticket } from 'generated/prisma/client'
import { TicketStatus, TicketType } from 'generated/prisma/enums'

import { TICKET_TIMER } from '~/constants/timeConstant'

const TICKET_PREFIX: Record<TicketType, string> = {
  REPORT: 'BC',
  FEEDBACK: 'GY',
  BUG: 'BL'
}

export class TicketRepository {
  public static async countTicketByType(guildId: string, type: TicketType) {
    return container.prisma.ticket.count({
      where: { guildId, type }
    })
  }

  public static async generateTicketCode(guildId: string, type: TicketType) {
    const count = await this.countTicketByType(guildId, type)
    return `${TICKET_PREFIX[type]}${String(count + 1).padStart(3, '0')}`
  }

  public static async getTicketChannelId(guildId: string) {
    if (guildId) return null
    return (
      (
        await container.prisma.ticketConfig.findUnique({
          where: { guildId },
          select: { ticketChannelId: true }
        })
      )?.ticketChannelId || null
    )
  }

  public static async createTicket({
    guildId,
    requesterId,
    type,
    threadId,
    createdAt,
    updatedAt
  }: {
    guildId: string
    requesterId: string
    type: TicketType
    threadId: string
    createdAt?: Date
    updatedAt?: Date
  }) {
    const code = await this.generateTicketCode(guildId, type)

    const ticket = await container.prisma.ticket.create({
      data: {
        guildId,
        requesterId,
        type,
        code,
        threadId,
        createdAt,
        updatedAt
      }
    })

    return ticket
  }

  public static async findByCode({ guildId, code }: { guildId: string; code: string }) {
    return container.prisma.ticket.findFirst({
      where: { guildId, code }
    })
  }

  public static async searchByCode({ guildId, search }: { guildId: string; search: string }) {
    return container.prisma.ticket.findMany({
      where: {
        guildId,
        code: { contains: search.toUpperCase() }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  }

  public static async getTickets({
    guildId,
    page = 1,
    limit = 10,
    type,
    status
  }: {
    guildId: string
    page: number
    limit: number
    type?: TicketType
    status?: TicketStatus
  }) {
    const cacheKey = `tickets:${guildId}:${page}:${limit}:${type || 'ALL'}:${status || 'ALL'}`
    const cached = await container.redis.get(cacheKey)

    if (cached) {
      const result = JSON.parse(cached)
      type CachedTicket = Omit<Ticket, 'createdAt' | 'updatedAt' | 'closedAt'> & {
        createdAt: string
        updatedAt: string
        closedAt: string | null
      }

      result.items = (result.items as CachedTicket[]).map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        closedAt: item.closedAt ? new Date(item.closedAt) : null
      }))
      return result
    }

    const skip = (page - 1) * limit

    // Build where clause based on status parameter
    const whereClause = {
      guildId,
      type,
      status
    }

    const [items, total] = await Promise.all([
      container.prisma.ticket.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),

      container.prisma.ticket.count({
        where: whereClause
      })
    ])

    const totalPages = Math.ceil(total / limit)

    const result = {
      items,
      meta: {
        total,
        totalPages,
        page,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        type,
        status
      }
    }

    await container.redis.set(cacheKey, JSON.stringify(result), 'EX', TICKET_TIMER.TTL.LIST)

    return result
  }

  public static async findByThreadId({ threadId }: { threadId: string }) {
    return container.prisma.ticket.findUnique({
      where: { threadId }
    })
  }

  public static async findById({ id }: { id: string }) {
    return container.prisma.ticket.findUnique({
      where: { id }
    })
  }

  public static async updateTicket({
    ticketId,
    data
  }: {
    ticketId: string
    data: Prisma.TicketUpdateInput
  }) {
    return container.prisma.ticket.update({
      where: { id: ticketId },
      data
    })
  }
}
