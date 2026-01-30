import { container } from '@sapphire/pieces'
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  ThreadAutoArchiveDuration,
  ThreadChannel
} from 'discord.js'

import { Ticket, TicketType } from 'generated/prisma/client'

import { BadRequestError, NotFoundError } from '~/core/errorResponse'

import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'
import { TicketRepository } from '~/repositories/ticketRepository'

interface CloseTicketOptions {
  thread: ThreadChannel
  closedById: string
  guildId: string
  reason?: string | null
}

interface CreateTicketOptions {
  interaction: ButtonInteraction
  type: TicketType
  description: string
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

  /**
   * Creates a new ticket with thread and initial message
   * @param options - Create ticket options
   */
  public static async createTicket(options: CreateTicketOptions): Promise<void> {
    const { interaction, type, description } = options

    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction.guild || !interaction.guildId) return

    const ticketChannelId = await GuildRepository.getTicketChannelId(interaction.guildId)

    if (!ticketChannelId) {
      throw new BadRequestError({
        description:
          'Hệ thống hỗ trợ thành viên chưa được thiết lập, vui lòng liên hệ **Ban quản lý**.'
      })
    }

    const channel = interaction.guild.channels.cache.get(ticketChannelId)
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new NotFoundError({
        description: 'Kênh hỗ trợ thành viên không tồn tại hoặc không hợp lệ.'
      })
    }

    const now = new Date()
    const code = await TicketRepository.generateTicketCode(interaction.guildId, type)

    const thread = await channel.threads.create({
      name: `#${code} - ${this.getTicketTypeLabel(type)}`,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      type: ChannelType.PrivateThread,
      invitable: false
    })

    await thread.members.add(interaction.user.id)

    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent(lines('## Bắt đầu hỗ trợ', description)))
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `**Mã phiếu:** _#${code}_`,
            `**Người tạo:** <@${interaction.user.id}>`,
            `**Thời gian tạo:** <t:${Math.floor(now.getTime() / 1000)}:R>`
          )
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((row) =>
        row
          .addComponents(
            new ButtonBuilder()
              .setCustomId('btn-ticket-close')
              .setLabel('Đóng')
              .setStyle(ButtonStyle.Secondary)
          )
          .addComponents(
            new ButtonBuilder()
              .setCustomId('btn-ticket-close-reason')
              .setLabel('Đóng với lý do')
              .setStyle(ButtonStyle.Danger)
          )
      )

    const message = await thread.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    })

    await Promise.all([
      message.pin(),
      TicketRepository.createTicket({
        guildId: interaction.guildId,
        requesterId: interaction.user.id,
        type,
        threadId: thread.id,
        firstMessageId: message.id,
        createdAt: now,
        updatedAt: now
      }),
      interaction.editReply({
        embeds: [
          createSuccessEmbed({
            title: 'Tạo thành công',
            description: `Kênh yêu cầu hỗ trợ của bạn đã được tạo thành công. Vui lòng truy cập vào <#${thread.id}> để thảo luận.`
          })
        ]
      })
    ])

    await deleteReplyInteraction(interaction)
  }

  public static async closeTicket(options: CloseTicketOptions): Promise<void> {
    const { thread, closedById, guildId, reason } = options

    const ticket = await TicketRepository.findByThreadId({ threadId: thread.id })

    if (!ticket) {
      throw new NotFoundError({
        description: 'Không tìm thấy phiếu hỗ trợ nào được liên kết với kênh này.'
      })
    }

    const updatedTicket = await TicketRepository.closeTicket({
      ticketId: ticket.id,
      guildId,
      closedBy: closedById,
      reason
    })

    const editFirstMessagePromise = ticket.firstMessageId
      ? thread.messages
          .fetch(ticket.firstMessageId)
          .then((firstMessage) => {
            const updatedContainer = new ContainerBuilder()
              .addTextDisplayComponents((text) =>
                text.setContent(
                  lines(
                    '## Bắt đầu hỗ trợ',
                    `Phiếu hỗ trợ **#${updatedTicket.code}** đã được đóng.`
                  )
                )
              )
              .addSeparatorComponents((separator) => separator)
              .addTextDisplayComponents((text) =>
                text.setContent(
                  lines(
                    `**Mã phiếu:** _#${updatedTicket.code}_`,
                    `**Người tạo:** <@${updatedTicket.requesterId}>`,
                    `**Thời gian tạo:** <t:${Math.floor(updatedTicket.createdAt.getTime() / 1000)}:R>`
                  )
                )
              )

            return firstMessage.edit({
              components: [updatedContainer],
              flags: MessageFlags.IsComponentsV2
            })
          })
          .catch((error) => {
            container.logger.error(error)
          })
      : Promise.resolve()

    const closeMessagePromise = thread.send({
      components: [
        new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent(
              lines(
                '## Kết thúc hỗ trợ',
                'Chúng mình xin chân thành cảm ơn sự hợp tác của bạn trong thời gian vừa qua.'
              )
            )
          )
          .addSeparatorComponents((sep) => sep)
          .addTextDisplayComponents((text) =>
            text.setContent(
              lines(
                `**Mã phiếu:** #${updatedTicket.code}`,
                `**Người tạo:** <@${updatedTicket.requesterId}>`,
                `**Thời gian tạo:** <t:${Math.floor(updatedTicket.createdAt.getTime() / 1000)}:R>`,
                `**Người đóng:** <@${updatedTicket.closedBy}>`,
                updatedTicket.closedAt &&
                  `**Thời gian đóng:** <t:${Math.floor(updatedTicket.closedAt.getTime() / 1000)}:R>`,
                reason && `**Lý do đóng:** ${reason}`
              )
            )
          )
      ],
      flags: ['IsComponentsV2']
    })

    await Promise.all([
      editFirstMessagePromise,
      closeMessagePromise,
      thread.setLocked(true),
      thread.setArchived(true)
    ])
  }
}
