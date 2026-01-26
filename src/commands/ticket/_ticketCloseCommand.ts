import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, ThreadChannel } from 'discord.js'

import { BadRequestError, NotFoundError } from '~/core/errorResponse'

import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { TicketRepository } from '~/repositories/ticketRepository'

export class TicketCloseCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const ticketThread = interaction.channel as ThreadChannel

    if (!ticketThread || ticketThread.type !== ChannelType.PrivateThread) {
      throw new BadRequestError({
        description: 'Vui lòng sử dụng lệnh này trong một kênh hỗ trợ mà bạn muốn đóng lại.'
      })
    }

    const ticket = await TicketRepository.findByThreadId({
      threadId: ticketThread.id
    })

    if (!ticket) {
      throw new NotFoundError({
        description: 'Hệ thống không tìm thấy kênh hỗ trợ này trong cơ sở dữ liệu.'
      })
    }

    if (ticket.closedAt) {
      throw new BadRequestError({
        description: 'Kênh hỗ trợ này đã được đóng trước đó.'
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
          .setDescription(
            `Chúng mình xin chân thành cảm ơn sự hợp tác của bạn\ntrong thời gian vừa qua.`
          )
          .setFields([
            {
              name: 'Mã phiếu',
              value: `**_#${updatedTicket.code}_**`,
              inline: false
            },
            {
              name: 'Người tạo',
              value: `<@${updatedTicket.requesterId}>`,
              inline: false
            },
            {
              name: 'Thời gian tạo',
              value: `<t:${Math.floor(updatedTicket.createdAt.getTime() / 1000)}:R>`,
              inline: false
            },
            {
              name: 'Người đóng',
              value: `<@${updatedTicket.closedById}>`,
              inline: false
            },

            {
              name: 'Thời gian đóng',
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
