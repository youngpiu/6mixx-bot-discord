import { container } from '@sapphire/pieces'
import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'
import { TIME } from '~/shared/constants/timeConstant'

import { Ticket } from 'generated/prisma/client'
import { TicketStatus, TicketType } from 'generated/prisma/enums'

const TICKET_PREFIX: Record<TicketType, string> = {
  REPORT: 'RP',
  FEEDBACK: 'FB',
  BUG: 'BU'
}

export class TicketRepository {
  /**
   * Generates a unique, sequential ticket code (e.g., RP001, FB042).
   * Uses atomic upsert on TicketCounter to prevent race conditions during concurrent requests.
   * Format: PREFIX + 3-digit number (padded).
   */
  public static async generateCode(guildId: string, type: TicketType) {
    // Use atomic increment on TicketCounter
    const counter = await container.prisma.ticketCounter.upsert({
      where: {
        guildId_type: {
          guildId,
          type
        }
      },
      create: {
        guildId,
        type,
        counter: 1
      },
      update: {
        counter: {
          increment: 1
        }
      }
    })

    return `${TICKET_PREFIX[type]}${String(counter.counter).padStart(3, '0')}`
  }

  /**
   * Creates a new ticket record in the database.
   * - Generates code if not provided
   * - Invalidates cache to ensure the new ticket appears in lists
   */
  public static async create({
    guildId,
    requesterId,
    type,
    code,
    channelId,
    createdAt,
    updatedAt
  }: {
    guildId: string
    requesterId: string
    type: TicketType
    code?: string
    channelId: string
    createdAt?: Date
    updatedAt?: Date
  }) {
    const ticketCode = code || (await this.generateCode(guildId, type))

    const ticket = await container.prisma.ticket.create({
      data: {
        guildId,
        requesterId,
        type,
        code: ticketCode,
        channelId,
        createdAt,
        updatedAt
      }
    })

    // Invalidate cache for this guild to reflect the new ticket
    await this.invalidateTicketCache(guildId)

    return ticket
  }

  /**
   * Invalidate all cached tickets for a guild
   */
  private static async invalidateTicketCache(guildId: string) {
    const pattern = `tickets:${guildId}:*`
    const keys = await container.redis.keys(pattern)

    if (keys.length > 0) {
      await container.redis.del(...keys)
    }
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

  /**
   * Retrieve a paginated list of tickets with optional filtering.
   * - Uses Redis caching to improve performance for frequent access.
   * - Includes requester and closer relations to avoid N+1 queries.
   */
  public static async findMany({
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
    const cacheKey = `tickets:${guildId}:${page}:${limit}:${type || '*'}:${status || '*'}`
    const cached = await container.redis.get(cacheKey)

    if (cached) {
      const result = JSON.parse(cached)
      result.items = (result.items as Ticket[]).map(TicketHelper.deserializeTicket)
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
        include: {
          requester: {
            select: { userId: true, guildId: true }
          },
          closer: {
            select: { userId: true, guildId: true }
          }
        },
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

    await container.redis.set(cacheKey, JSON.stringify(result), 'EX', TIME.S30 / 1000)

    return result
  }

  // Find ticket associated with a specific text channel
  public static async findByChannelId(channelId: string) {
    return container.prisma.ticket.findUnique({
      where: { channelId }
    })
  }

  // Retrieve ticket by its unique database ID
  public static async findById(id: string) {
    return container.prisma.ticket.findUnique({
      where: { id }
    })
  }

  /**
   * Updates database record to mark a ticket as closed.
   * - Sets status to CLOSED
   * - Records closure time and closer ID
   * - Invalidates cache
   */
  public static async close({
    id,
    closedBy,
    reason
  }: {
    id: string
    closedBy: string
    reason?: string | null
  }) {
    const result = await container.prisma.ticket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy,
        reason
      }
    })

    // Invalidate cache for this guild after closure
    await this.invalidateTicketCache(result.guildId)

    return result
  }
}
