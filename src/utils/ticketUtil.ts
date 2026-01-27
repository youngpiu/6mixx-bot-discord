import { Ticket, TicketType } from 'generated/prisma/client'

/**
 * Maps ticket types to Vietnamese labels
 */
export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  REPORT: 'Báo cáo',
  FEEDBACK: 'Góp ý',
  BUG: 'Báo lỗi'
}

/**
 * Gets the Vietnamese label for a ticket type
 * @param type - The ticket type
 * @returns Vietnamese label for the ticket type
 */
export const getTicketTypeLabel = (type: TicketType): string => {
  return TICKET_TYPE_LABELS[type]
}

/**
 * Deserializes a ticket from a JSON string or object, converting date strings to Date objects
 * @param data - The ticket data (string or object)
 * @returns The deserialized ticket with Date objects
 */
export const deserializeTicket = (data: string | Ticket): Ticket => {
  const parsed = typeof data === 'string' ? JSON.parse(data) : data

  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt),
    closedAt: parsed.closedAt ? new Date(parsed.closedAt) : null
  }
}
