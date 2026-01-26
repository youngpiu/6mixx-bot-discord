import { TicketType } from 'generated/prisma/client'

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
