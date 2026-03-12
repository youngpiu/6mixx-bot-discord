import { container } from '@sapphire/pieces'
import { Colors, ForumChannel, MessageFlags, TextChannel } from 'discord.js'

import { Ticket, TicketType } from 'generated/prisma/client'
import { TicketStatus } from 'generated/prisma/enums'

import { LoggerBuilder } from '~/shared/components/LoggerBuilder'

import { GuildRepository } from '~/modules/ticket/repositories/guildRepository'

interface TicketLogOptions {
  guildId: string
  ticket: Ticket
  event: 'CREATED' | 'CLOSED'
  executorId: string
  channelId?: string
  reason?: string | null
  ticketConfig?: Awaited<ReturnType<typeof GuildRepository.getConfig>> | null
}

export class TicketHelper {
  // Maps ticket types to their human-readable Vietnamese labels
  public static readonly TICKET_TYPE_LABELS: Record<TicketType, string> = {
    REPORT: 'Báo cáo',
    FEEDBACK: 'Góp ý',
    BUG: 'Báo lỗi'
  }

  // Retrieves the Vietnamese display label for a given ticket type.
  // Used for UI display in embeds and messages.
  public static getTicketTypeLabel(type: TicketType): string {
    return this.TICKET_TYPE_LABELS[type]
  }

  // Converts TicketStatus enum to Vietnamese text
  public static getStatusText(status: TicketStatus): string {
    switch (status) {
      case TicketStatus.OPEN:
        return 'Mở'
      case TicketStatus.CLOSED:
        return 'Đóng'
      default:
        return status
    }
  }

  // Deserializes ticket data from Redis cache or Prisma result.
  // Redis stores dates as strings, so they must be converted back to Date objects.
  public static deserializeTicket(data: string | Ticket): Ticket {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data

    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      closedAt: parsed.closedAt ? new Date(parsed.closedAt) : null
    }
  }

  // Sends a structured log message to the configured notification thread.
  // Handles both 'CREATED' and 'CLOSED' events with different formatting.
  // Returns null if logging fails or is not configured (fail-safe).
  public static async sendTicketLog(
    options: TicketLogOptions
  ): Promise<string | null> {
    const { guildId, ticket, event, executorId, reason, channelId } = options

    try {
      const ticketConfig =
        options.ticketConfig ?? (await GuildRepository.getConfig(guildId))
      if (
        !ticketConfig?.ticketNotificationThreadId ||
        !ticketConfig.notificationForumChannelId
      )
        return null

      const notificationChannel = (await container.client.channels.fetch(
        ticketConfig.notificationForumChannelId
      )) as TextChannel | ForumChannel
      if (!notificationChannel) return null

      const thread = await notificationChannel.threads.fetch(
        ticketConfig.ticketNotificationThreadId
      )
      if (!thread) return null

      let logContainer: LoggerBuilder

      if (event === 'CREATED') {
        logContainer = new LoggerBuilder({
          title: `PHIẾU HỖ TRỢ MỚI \`#${ticket.code}\``,
          color: Colors.Blue
        }).addFields([
          ['Loại phiếu', `**${this.getTicketTypeLabel(ticket.type)}**`],
          ['Người tạo', `<@${ticket.requesterId}>`],
          [
            'Thời gian tạo',
            `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`
          ],
          ['Kênh hỗ trợ', `<#${channelId || ticket.channelId}>`]
        ])
      } else if (event === 'CLOSED') {
        const closedFields: [string, string | null | undefined][] = [
          ['Loại phiếu', `**${this.getTicketTypeLabel(ticket.type)}**`],
          ['Người tạo', `<@${ticket.requesterId}>`],
          [
            'Thời gian tạo',
            `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`
          ],
          ['Người đóng', `<@${executorId}>`],
          ['Thời gian đóng', `<t:${Math.floor(new Date().getTime() / 1000)}:R>`]
        ]
        if (reason) {
          closedFields.push(['Lý do', `**${reason}**`])
        }

        logContainer = new LoggerBuilder({
          title: `ĐÓNG PHIẾU HỖ TRỢ \`#${ticket.code}\``,
          color: Colors.Red
        }).addFields(closedFields)
      } else {
        return null
      }

      await thread.send({
        components: logContainer.build(),
        flags: [MessageFlags.IsComponentsV2]
      })

      return null
    } catch (error) {
      container.logger.error('Failed to send ticket log:', error)
      return null
    }
  }
}
