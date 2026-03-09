import { container } from '@sapphire/pieces'
import {
  ContainerBuilder,
  ForumChannel,
  MessageFlags,
  TextChannel,
  TextDisplayBuilder
} from 'discord.js'
import { GuildRepository } from '~/modules/ticket/repositories/guildRepository'
import { TicketRepository } from '~/modules/ticket/repositories/ticketRepository'
import { lines } from '~/shared/utils/textUtil'

import { Ticket, TicketType } from 'generated/prisma/client'
import { TicketStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

interface CloseTicketOptions {
  channel: TextChannel
  closedById: string
  guildId: string
  reason?: string | null
}

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

  /**
   * Retrieves the Vietnamese display label for a given ticket type.
   * Used for UI display in embeds and messages.
   */
  public static getTicketTypeLabel(type: TicketType): string {
    return this.TICKET_TYPE_LABELS[type]
  }

  /**
   * Converts TicketStatus enum to Vietnamese text
   */
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

  /**
   * Deserializes ticket data from Redis cache or Prisma result.
   * vital because Redis stores dates as strings, so they must be converted back to Date objects.
   */
  public static deserializeTicket(data: string | Ticket): Ticket {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data

    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      closedAt: parsed.closedAt ? new Date(parsed.closedAt) : null
    }
  }

  /**
   * Handles the complete ticket closing process.
   * This includes:
   * 1. Validating ticket existence and status
   * 2. Sending a log to the notification thread
   * 3. Updating the ticket status in the database
   * 4. Sending a closure message in the ticket channel
   * 5. Scheduling the channel for deletion
   */
  public static async closeTicket(options: CloseTicketOptions): Promise<void> {
    const { channel, closedById, guildId, reason } = options

    const [ticket, ticketConfig] = await Promise.all([
      TicketRepository.findByChannelId(channel.id),
      GuildRepository.getConfig(guildId)
    ])

    if (!ticket) {
      throw new NormalError(
        'Không tìm thấy phiếu hỗ trợ nào được liên kết với kênh này, vui lòng kiểm tra lại cơ sở dữ liệu.'
      )
    }

    if (ticket.status === 'CLOSED') {
      throw new NormalError(
        'Không thể đóng phiếu hỗ trợ đã đóng trước đó, vui lòng bỏ qua nút này.'
      )
    }

    // Run log sending and DB update in parallel for better performance
    const [, updatedTicket] = await Promise.all([
      this.sendTicketLog({
        guildId,
        ticket,
        event: 'CLOSED',
        executorId: closedById,
        reason,
        ticketConfig // Pass config to avoid duplicate fetch optimization
      }),
      TicketRepository.close({
        id: ticket.id,
        closedBy: closedById,
        reason
      })
    ])

    const closingContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          lines(
            '## Kết thúc hỗ trợ',
            'Chúng mình xin chân thành cảm ơn sự hợp tác của bạn trong thời gian vừa qua.'
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          lines(`**_Kênh này sẽ tự động xóa sau 30 giây._**`)
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          lines(
            `- **Mã phiếu:** #${updatedTicket.code}`,
            `- **Người tạo:** <@${updatedTicket.requesterId}>`,
            `- **Thời gian tạo:** <t:${Math.floor(updatedTicket.createdAt.getTime() / 1000)}:R>`,
            `- **Người đóng:** <@${updatedTicket.closedBy}>`,
            updatedTicket.closedAt &&
              `- **Thời gian đóng:** <t:${Math.floor(updatedTicket.closedAt.getTime() / 1000)}:R>`,
            reason && `- **Lý do đóng:** ${reason}`
          )
        )
      )

    // Parallelize the final response and task scheduling for better performance
    await Promise.all([
      channel.send({
        components: [closingContainer],
        allowedMentions: { users: [updatedTicket.requesterId] },
        flags: ['IsComponentsV2']
      }),
      container.tasks.create(
        { name: 'deleteTicketChannel', payload: { channelId: channel.id } },
        30000
      )
    ])
  }

  /**
   * Sends a structured log message to the configured notification thread.
   * Handles both 'CREATED' and 'CLOSED' events with different formatting.
   * Returns null if logging fails or is not configured (fail-safe).
   */
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

      const logContainer = new ContainerBuilder()

      if (event === 'CREATED') {
        logContainer
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### PHIẾU HỖ TRỢ MỚI - #${ticket.code}`
            )
          )
          .addSeparatorComponents((sep) => sep)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              lines(
                `- **Loại phiếu:** ${this.getTicketTypeLabel(ticket.type)}`,
                `- **Người tạo:** <@${ticket.requesterId}>`,
                `- **Thời gian tạo:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`,
                `- **Kênh hỗ trợ:** <#${channelId || ticket.channelId}>`
              )
            )
          )
      } else if (event === 'CLOSED') {
        logContainer
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### ĐÓNG PHIẾU HỖ TRỢ - #${ticket.code}`
            )
          )
          .addSeparatorComponents((sep) => sep)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              lines(
                `- **Loại phiếu:** ${this.getTicketTypeLabel(ticket.type)}`,
                `- **Người tạo:** <@${ticket.requesterId}>`,
                `- **Thời gian tạo:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`,
                `- **Người đóng:** <@${executorId}>`,
                `- **Thời gian đóng:** <t:${Math.floor(new Date().getTime() / 1000)}:R>`,
                reason && `- **Lý do:** ${reason}`
              )
            )
          )
      }

      await thread.send({
        components: [logContainer],
        flags: [MessageFlags.IsComponentsV2]
      })

      return null
    } catch (error) {
      container.logger.error('Failed to send ticket log:', error)
      return null
    }
  }
}
