import { container } from '@sapphire/pieces'
import { createTranscript } from 'discord-html-transcripts'
import {
  AttachmentBuilder,
  ContainerBuilder,
  FileBuilder,
  ForumChannel,
  MessageFlags,
  TextChannel,
  TextDisplayBuilder
} from 'discord.js'

import { Ticket, TicketType } from 'generated/prisma/client'

import { BadRequestError, NotFoundError } from '~/core/errorResponse'

import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'
import { TicketRepository } from '~/repositories/ticketRepository'

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
  attachment?: unknown // Transcript attachment
}

export class TicketHelper {
  public static readonly TICKET_TYPE_LABELS: Record<TicketType, string> = {
    REPORT: 'Báo cáo',
    FEEDBACK: 'Góp ý',
    BUG: 'Báo lỗi'
  }

  public static getTicketTypeLabel(type: TicketType): string {
    return this.TICKET_TYPE_LABELS[type]
  }

  public static deserializeTicket(data: string | Ticket): Ticket {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data

    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      closedAt: parsed.closedAt ? new Date(parsed.closedAt) : null
    }
  }

  public static async closeTicket(options: CloseTicketOptions): Promise<void> {
    const { channel, closedById, guildId, reason } = options

    const [ticket, ticketConfig] = await Promise.all([
      TicketRepository.findByChannelId({ channelId: channel.id }),
      GuildRepository.getTicketConfig(guildId)
    ])

    if (!ticket) {
      throw new NotFoundError({
        description:
          'Không tìm thấy phiếu hỗ trợ nào được liên kết với kênh này, vui lòng kiểm tra lại cơ sở dữ liệu.'
      })
    }

    if (ticket.status === 'CLOSED') {
      throw new BadRequestError({
        description: 'Không thể đóng phiếu hỗ trợ đã đóng trước đó, vui lòng bỏ qua nút này.'
      })
    }

    let transcriptAttachment: AttachmentBuilder | null = null

    try {
      if (ticketConfig?.ticketNotificationThreadId && ticketConfig.notificationForumChannelId) {
        const notificationChannel = channel.guild.channels.cache.get(
          ticketConfig.notificationForumChannelId
        ) as TextChannel | ForumChannel

        if (notificationChannel) {
          const [thread, attachment] = await Promise.all([
            notificationChannel.threads.fetch(ticketConfig.ticketNotificationThreadId),
            createTranscript(channel, {
              limit: -1,
              filename: `ticket-${ticket.code}.html`,
              poweredBy: false,
              saveImages: true
            })
          ])

          if (thread) {
            transcriptAttachment = attachment
          }
        }
      }
    } catch (error) {
      container.logger.error('Failed to generate transcript:', error)
    }

    // Send log and get transcript URL
    const transcriptUrl = await this.sendTicketLog({
      guildId,
      ticket,
      event: 'CLOSED',
      executorId: closedById,
      reason,
      attachment: transcriptAttachment
    })

    const updatedTicket = await TicketRepository.closeTicket({
      ticketId: ticket.id,
      guildId,
      closedBy: closedById,
      reason,
      transcriptUrl
    })

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
        new TextDisplayBuilder().setContent(lines(`**_Kênh này sẽ tự động xóa sau 30 giây._**`))
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

  public static async sendTicketLog(options: TicketLogOptions): Promise<string | null> {
    const { guildId, ticket, event, executorId, reason, attachment, channelId } = options

    try {
      const ticketConfig = await GuildRepository.getTicketConfig(guildId)
      if (!ticketConfig?.ticketNotificationThreadId || !ticketConfig.notificationForumChannelId)
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
              `## <:iconbadge10:1467803700524355624> PHIẾU HỖ TRỢ MỚI - #${ticket.code}`
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
              `## <:iconbadge11:1467803698863276105> ĐÓNG PHIẾU HỖ TRỢ - #${ticket.code}`
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

        if (attachment && typeof attachment === 'object' && 'name' in attachment) {
          logContainer
            .addSeparatorComponents((sep) => sep)
            .addFileComponents(
              new FileBuilder().setURL(`attachment://${(attachment as { name: string }).name}`)
            )
        }
      }

      const message = await thread.send({
        components: [logContainer],
        files: attachment ? [attachment as AttachmentBuilder] : [],
        flags: [MessageFlags.IsComponentsV2]
      })

      return message.attachments.first()?.url ?? null
    } catch (error) {
      container.logger.error('Failed to send ticket log:', error)
      return null
    }
  }
}
