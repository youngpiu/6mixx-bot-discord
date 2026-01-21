import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { BadRequestError } from '~/core/errorResponse'
import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { TicketRepository } from '~/repositories/ticketRepository'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

export class TicketDetailCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const ticketCode = interaction.options.getString('ticket-id', true)

    if (!ticketCode) {
      throw new BadRequestError({
        description: 'Vui lòng lựa chọn một phiếu hỗ trợ mà bạn muốn xem thông tin chi tiết.'
      })
    }

    const ticket = await TicketRepository.findById({
      id: ticketCode
    })

    if (!ticket) {
      throw new BadRequestError({
        description: `Hệ thống không tìm thấy phiếu hỗ trợ mà bạn đang tìm kiếm.`
      })
    }

    const typeLabel =
      ticket.type === 'REPORT' ? 'Báo cáo' : ticket.type === 'FEEDBACK' ? 'Góp ý' : 'Báo lỗi'

    const fields = [
      { name: 'Mã phiếu', value: `**_#${ticket.code}_**`, inline: false },
      { name: 'Loại phiếu', value: typeLabel, inline: false },
      { name: 'Địa chỉ kênh', value: `<#${ticket.threadId}>`, inline: false },
      { name: 'Người tạo', value: `<@${ticket.requesterId}>`, inline: false },
      {
        name: 'Ngày tạo',
        value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`,
        inline: false
      }
    ]

    if (ticket.closedById) {
      fields.push({ name: 'Người đóng', value: `<@${ticket.closedById}>`, inline: false })
    }

    if (ticket.closedAt) {
      fields.push({
        name: 'Ngày đóng',
        value: `<t:${Math.floor(ticket.closedAt.getTime() / 1000)}:R>`,
        inline: false
      })
    }

    if (ticket.reason) {
      fields.push({ name: 'Lý do đóng', value: ticket.reason, inline: false })
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(ticket.closedAt ? 'Grey' : 'Navy')
          .setTitle(`Thông tin phiếu #${ticket.code}`)
          .setFields(fields)
      ]
    })
  }
}
