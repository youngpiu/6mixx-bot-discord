import { container } from '@sapphire/pieces'
import { CACHE_TTL } from '~/config/time'

import { Prisma, Ticket } from 'generated/prisma/client'
import { TicketStatus, TicketType } from 'generated/prisma/enums'

import { CACHE_WILDCARD } from '~/constants/commonConstant'

import { deserializeTicket } from '~/utils/ticketUtil'

import { MemberRepository } from '~/repositories/memberRepository'

const TICKET_PREFIX: Record<TicketType, string> = {
  REPORT: 'RP',
  FEEDBACK: 'FB',
  BUG: 'BU'
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

    // Ensure requester member exists
    await MemberRepository.getOrCreate({ guildId, userId: requesterId })

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
    const cacheKey = `tickets:${guildId}:${page}:${limit}:${type || CACHE_WILDCARD}:${status || CACHE_WILDCARD}`
    const cached = await container.redis.get(cacheKey)

    if (cached) {
      const result = JSON.parse(cached)
      result.items = (result.items as Ticket[]).map(deserializeTicket)
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

    await container.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL.VERY_SHORT)

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
    data: Prisma.TicketUncheckedUpdateInput
  }) {
    return container.prisma.ticket.update({
      where: { id: ticketId },
      data
    })
  }

  public static async closeTicket({
    ticketId,
    guildId,
    closedBy,
    reason
  }: {
    ticketId: string
    guildId: string
    closedBy: string
    reason?: string | null
  }) {
    // Ensure closer member exists
    await MemberRepository.getOrCreate({ guildId, userId: closedBy })

    return container.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy,
        reason
      }
    })
  }
}
