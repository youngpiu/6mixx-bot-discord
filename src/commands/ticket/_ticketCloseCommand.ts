import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ThreadChannel
} from 'discord.js'
import { BadRequestError } from '~/core/errorResponse'
import { TicketRepository } from '~/repositories/ticketRepository'
import { createSuccessEmbed } from '~/utils/embedUtil'

export class TicketCloseCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const ticketChannel = interaction.channel as ThreadChannel

    if (!ticketChannel || ticketChannel.type !== ChannelType.PrivateThread) {
      throw new BadRequestError({
        description: 'Vui lòng sử dụng lệnh này trong phiếu hỗ trợ.'
      })
    }

    const ticket = await TicketRepository.findByThreadId({
      threadId: ticketChannel.id
    })

    if (!ticket) {
      throw new BadRequestError({
        description: 'Không tìm thấy phiếu hỗ trợ này trong hệ thống.'
      })
    }

    if (ticket.closedAt) {
      throw new BadRequestError({
        description: 'Phiếu hỗ trợ này đã được đóng.'
      })
    }

    const reason = interaction.options.getString('reason')

    const updatedTicket = await TicketRepository.updateTicket({
      ticketId: ticket.id,
      data: {
        closedAt: new Date(),
        closedById: interaction.user.id,
        reason
      }
    })

    await ticketChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('LuminousVividPink')
          .setTitle('Kết thúc hỗ trợ')
          .setDescription(
            'Phiếu hỗ trợ này đã bị đóng. Cảm ơn sự hợp tác của bạn trong thời gian vừa qua.'
          )
          .setFields([
            { name: 'Mã phiếu', value: updatedTicket.code, inline: true },
            {
              name: 'Loại phiếu',
              value:
                updatedTicket.type === 'REPORT'
                  ? 'Báo cáo'
                  : updatedTicket.type === 'FEEDBACK'
                    ? 'Góp ý'
                    : 'Báo lỗi',
              inline: true
            },
            {
              name: 'Người tạo',
              value: `<@${updatedTicket.requesterId}>`,
              inline: true
            },
            {
              name: 'Người đóng',
              value: `<@${updatedTicket.closedById}>`,
              inline: true
            },
            ...(reason
              ? [
                  {
                    name: 'Lý do đóng',
                    value: reason,
                    inline: true
                  }
                ]
              : []),
            {
              name: 'Ngày tạo',
              value: `<t:${Math.floor(updatedTicket.createdAt.getTime() / 1000)}:R>`,
              inline: true
            },
            {
              name: 'Ngày đóng',
              value: updatedTicket.closedAt
                ? `<t:${Math.floor(updatedTicket.closedAt.getTime() / 1000)}:R>`
                : 'Chưa đóng',
              inline: true
            }
          ])
      ]
    })

    await ticketChannel.setLocked(true)
    await ticketChannel.setArchived(true)
    return await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          description: 'Đóng phiếu hỗ trợ này thành công.'
        })
      ]
    })
  }
}
