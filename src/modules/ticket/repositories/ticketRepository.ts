import { container } from '@sapphire/pieces'

import { TicketStatus, TicketType } from 'generated/prisma/enums'

import { TIME } from '~/shared/constants/timeConstant'
import { CounterRepository } from '~/shared/repositories/counterRepository'
import { CacheService } from '~/shared/services/cacheService'

const TICKET_PREFIX: Record<TicketType, string> = {
  REPORT: 'RP',
  FEEDBACK: 'FB',
  BUG: 'BU'
}

export class TicketRepository {
  // Generates a unique, sequential ticket code (e.g., RP001, FB042).
  // Uses atomic upsert on AutoIncrement to prevent race conditions during concurrent requests.
  // Format: PREFIX + 3-digit number (padded).
  public static async generateCode(guildId: string, type: TicketType) {
    return CounterRepository.generateCode(
      guildId,
      `TICKET_${type}`,
      TICKET_PREFIX[type]
    )
  }

  // Creates a new ticket record in the database.
  // - Generates code if not provided
  // - Invalidates cache to ensure the new ticket appears in lists
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

    // Ensure requester exists in Member table before creating ticket (FK constraint)
    await container.prisma.member.upsert({
      where: { guildId_id: { id: requesterId, guildId } },
      create: { id: requesterId, guildId },
      update: {}
    })

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

  // Invalidate all cached tickets for a guild
  private static async invalidateTicketCache(guildId: string) {
    await CacheService.invalidatePattern(`tickets:${guildId}:*`)
  }

  public static async searchByCode({
    guildId,
    search
  }: {
    guildId: string
    search: string
  }) {
    return container.prisma.ticket.findMany({
      where: {
        guildId,
        code: { contains: search.toUpperCase() }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  }

  // Retrieve a paginated list of tickets with optional filtering.
  // - Uses Redis caching to improve performance for frequent access.
  // - Includes requester and closer relations to avoid N+1 queries.
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
    const skip = (page - 1) * limit

    // Build where clause based on status parameter
    const whereClause = { guildId, type, status }

    const result = await CacheService.remember(cacheKey, TIME.S30, async () => {
      const [items, total] = await Promise.all([
        container.prisma.ticket.findMany({
          where: whereClause,
          include: {
            requester: { select: { id: true, guildId: true } },
            closer: { select: { id: true, guildId: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        container.prisma.ticket.count({ where: whereClause })
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
          type,
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
        closedAt: item.closedAt ? new Date(item.closedAt) : null
      }))
    }
  }

  public static async findByCode(code: string) {
    const cleanCode = code.replace(/#/g, '').toUpperCase()
    return container.prisma.ticket.findUnique({
      where: { code: cleanCode }
    })
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

  // Updates database record to mark a ticket as closed.
  // - Sets status to CLOSED
  // - Records closure time and closer ID
  // - Invalidates cache
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

  // Deletes a ticket from the database by its ID
  // - Invalidates cache after deletion
  public static async delete(id: string) {
    const ticket = await container.prisma.ticket.delete({
      where: { id }
    })

    await this.invalidateTicketCache(ticket.guildId)
    return ticket
  }
}
