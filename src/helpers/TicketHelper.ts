import { container } from '@sapphire/pieces'
import { createTranscript } from 'discord-html-transcripts'
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  TextChannel
} from 'discord.js'

import { Ticket, TicketType } from 'generated/prisma/client'

import { BadRequestError, GuildOnlyError, NotFoundError } from '~/core/errorResponse'

import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'
import { TicketRepository } from '~/repositories/ticketRepository'

interface CloseTicketOptions {
  channel: TextChannel
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
   * Creates a new ticket with text channel in category and initial message
   * @param options - Create ticket options
   */
  public static async createTicket(options: CreateTicketOptions): Promise<void> {
    const { interaction, type, description } = options

    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction.guild || !interaction.guildId) throw new GuildOnlyError()

    const ticketConfig = await GuildRepository.getTicketConfig(interaction.guildId)
    const ticketCategoryId = ticketConfig?.ticketCategoryId

    if (!ticketCategoryId) {
      throw new BadRequestError({
        description:
          'Hệ thống hỗ trợ thành viên chưa được thiết lập, vui lòng liên hệ **Ban quản lý**.'
      })
    }

    const category = interaction.guild.channels.cache.get(ticketCategoryId)
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new NotFoundError({
        description: 'Danh mục chứa kênh hỗ trợ không tồn tại hoặc không hợp lệ.'
      })
    }

    const now = new Date()
    const code = await TicketRepository.generateTicketCode(interaction.guildId, type)

    // Create text channel in category with permissions
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${code}`,
      type: ChannelType.GuildText,
      parent: ticketCategoryId,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: ['ViewChannel']
        },
        {
          id: interaction.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
        }
      ]
    })

    const containerMessage = new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent(lines('## Bắt đầu hỗ trợ', description)))
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `**- Mã phiếu:** _#${code}_`,
            `**- Người tạo:** <@${interaction.user.id}>`,
            `**- Thời gian tạo:** <t:${Math.floor(now.getTime() / 1000)}:R>`
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

    const message = await ticketChannel.send({
      components: [containerMessage],
      flags: MessageFlags.IsComponentsV2
    })

    await Promise.all([
      message.pin(),
      TicketRepository.createTicket({
        guildId: interaction.guildId,
        requesterId: interaction.user.id,
        type,
        channelId: ticketChannel.id,
        createdAt: now,
        updatedAt: now
      }),
      interaction.editReply({
        embeds: [
          createSuccessEmbed({
            title: 'Tạo thành công',
            description: `Kênh yêu cầu hỗ trợ của bạn đã được tạo thành công. Vui lòng truy cập vào <#${ticketChannel.id}> để thảo luận.`
          })
        ]
      })
    ])

    await deleteReplyInteraction(interaction)
  }

  public static async closeTicket(options: CloseTicketOptions): Promise<void> {
    const { channel, closedById, guildId, reason } = options

    const ticket = await TicketRepository.findByChannelId({ channelId: channel.id })

    if (!ticket) {
      throw new NotFoundError({
        description: 'Không tìm thấy phiếu hỗ trợ nào được liên kết với kênh này.'
      })
    }

    // Generate transcript
    let transcriptUrl: string | null = null
    try {
      const ticketConfig = await GuildRepository.getTicketConfig(guildId)
      if (ticketConfig?.ticketNotificationThreadId && ticketConfig.notificationChannelId) {
        const notificationChannel = channel.guild.channels.cache.get(
          ticketConfig.notificationChannelId
        ) as TextChannel

        if (notificationChannel) {
          const thread = await notificationChannel.threads.fetch(
            ticketConfig.ticketNotificationThreadId
          )
          if (thread) {
            const attachment = await createTranscript(channel, {
              limit: -1,
              filename: `ticket-${ticket.code}.html`,
              poweredBy: false,
              saveImages: true
            })

            const message = await thread.send({
              content: `Transcript cho phiếu hỗ trợ **#${ticket.code}**`,
              files: [attachment]
            })
            transcriptUrl = message.attachments.first()?.url ?? null
          }
        }
      }
    } catch (error) {
      container.logger.error('Failed to generate/send transcript:', error)
    }

    const updatedTicket = await TicketRepository.closeTicket({
      ticketId: ticket.id,
      guildId,
      closedBy: closedById,
      reason,
      transcriptUrl
    })

    await channel.send({
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

    // Delete the ticket channel after 10 seconds
    setTimeout(async () => {
      try {
        await channel.delete()
      } catch (error) {
        container.logger.error(`Failed to delete ticket channel ${channel.id}:`, error)
      }
    }, 10000)
  }
}
