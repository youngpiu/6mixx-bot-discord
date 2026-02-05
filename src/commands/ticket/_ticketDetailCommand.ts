import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { TicketStatus } from 'generated/prisma/enums'

import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError, NotFoundError } from '~/core/errorResponse'

import { TicketHelper } from '~/helpers/TicketHelper'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { TicketRepository } from '~/repositories/ticketRepository'

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

    const id = interaction.options.getString('ticket-id', true)

    if (!id) {
      throw new BadRequestError({
        description: 'Vui lòng lựa chọn một phiếu hỗ trợ mà bạn muốn xem thông tin chi tiết.'
      })
    }

    const ticket = await TicketRepository.findById({
      id: id
    })

    if (!ticket) {
      throw new NotFoundError({
        description: `Hệ thống không tìm thấy phiếu hỗ trợ này trong cơ sở dữ liệu.`
      })
    }

    const typeLabel = TicketHelper.getTicketTypeLabel(ticket.type)

    const fields = [
      { name: 'Mã phiếu', value: `**_#${ticket.code}_**`, inline: false },
      { name: 'Loại phiếu', value: typeLabel, inline: false },
      {
        name: 'Trạng thái',
        value: ticket.status === TicketStatus.CLOSED ? 'Đóng' : 'Mở',
        inline: false
      },
      { name: 'Thread', value: `<#${ticket.threadId}>`, inline: false },
      { name: 'Người tạo', value: `<@${ticket.requesterId}>`, inline: false },
      {
        name: 'Thời gian tạo',
        value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`,
        inline: false
      }
    ]

    if (ticket.closedBy) {
      fields.push({ name: 'Người đóng', value: `<@${ticket.closedBy}>`, inline: false })
    }

    if (ticket.closedAt) {
      fields.push({
        name: 'Thời gian đóng',
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
          .setColor(ticket.status === TicketStatus.CLOSED ? 'DarkRed' : 'Green')
          .setTitle(`Thông tin phiếu #${ticket.code}`)
          .setFields(fields)
      ]
    })
    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.MEDIUM)
  }
}
