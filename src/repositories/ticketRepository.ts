import { container } from '@sapphire/pieces'
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

  public static async updateThreadIdOfTicket({
    ticketId,
    threadId
  }: {
    ticketId: string
    threadId: string
  }) {
    const ticket = await container.prisma.ticket.update({
      where: {
        id: ticketId
      },
      data: {
        threadId
      }
    })

    return ticket
  }

  public static async findByCode({
    guildId,
    code
  }: {
    guildId: string
    code: string
  }) {
    return container.prisma.ticket.findFirst({
      where: { guildId, code }
    })
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
        code: { startsWith: search.toUpperCase() }
      },
      orderBy: { createdAt: 'desc' },
      take: 25
    })
  }
}
