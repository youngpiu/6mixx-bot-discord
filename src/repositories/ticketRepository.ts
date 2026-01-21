import { container } from '@sapphire/pieces'
import { Prisma } from 'generated/prisma/client'
import { TicketType } from 'generated/prisma/enums'

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

  public static async createTicket({
    guildId,
    requesterId,
    type,
    threadId
  }: {
    guildId: string
    requesterId: string
    type: TicketType
    threadId: string
  }) {
    const code = await this.generateTicketCode(guildId, type)

    const ticket = await container.prisma.ticket.create({
      data: {
        guildId,
        requesterId,
        type,
        code,
        threadId
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
    isOpen
  }: {
    guildId: string
    page: number
    limit: number
    type?: TicketType
    isOpen?: boolean
  }) {
    const skip = (page - 1) * limit

    // Build where clause based on isOpen parameter
    const whereClause = {
      guildId,
      type,
      ...(isOpen === true && { closedAt: null }),
      ...(isOpen === false && { closedAt: { not: null } })
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
        isOpen
      }
    }
  }

  public static async closeTicket({
    ticketId,
    closedById
  }: {
    ticketId: string
    closedById: string
  }) {
    return container.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        closedById,
        closedAt: new Date()
      }
    })
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
