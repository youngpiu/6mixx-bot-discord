import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, ThreadChannel } from 'discord.js'
import { BadRequestError } from '~/core/errorResponse'
import { TicketRepository } from '~/repositories/ticketRepository'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

export class TicketCloseCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const ticketThread = interaction.channel as ThreadChannel

    if (!ticketThread || ticketThread.type !== ChannelType.PrivateThread) {
      throw new BadRequestError({
        description: 'Vui lòng sử dụng lệnh này trong phiếu hỗ trợ.'
      })
    }

    const ticket = await TicketRepository.findByThreadId({
      threadId: ticketThread.id
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

    await ticketThread.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Kết thúc hỗ trợ')
          .setDescription('Cảm ơn sự hợp tác của bạn \ntrong thời gian vừa qua.')
          .setFields([
            {
              name: 'Mã phiếu',
              value: `**_#${updatedTicket.code}_**`,
              inline: false
            },
            {
              name: 'Loại phiếu',
              value:
                updatedTicket.type === 'REPORT'
                  ? 'Báo cáo'
                  : updatedTicket.type === 'FEEDBACK'
                    ? 'Góp ý'
                    : 'Báo lỗi',
              inline: false
            },
            {
              name: 'Người tạo',
              value: `<@${updatedTicket.requesterId}>`,
              inline: false
            },
            {
              name: 'Ngày tạo',
              value: `<t:${Math.floor(updatedTicket.createdAt.getTime() / 1000)}:R>`,
              inline: false
            },
            {
              name: 'Người đóng',
              value: `<@${updatedTicket.closedById}>`,
              inline: false
            },

            {
              name: 'Ngày đóng',
              value: updatedTicket.closedAt
                ? `<t:${Math.floor(updatedTicket.closedAt.getTime() / 1000)}:R>`
                : 'Chưa đóng',
              inline: false
            },
            ...(reason
              ? [
                  {
                    name: 'Lý do đóng',
                    value: reason,
                    inline: false
                  }
                ]
              : [])
          ])
      ]
    })

    await ticketThread.setLocked(true)
    await ticketThread.setArchived(true)
    await deleteReplyInteraction(interaction, 0)
  }
}
