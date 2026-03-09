import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'
import { TicketRepository } from '~/modules/ticket/repositories/ticketRepository'

import { TicketStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

export class TicketDetailCommand {
  /**
   * Helper command to display detailed information about a specific ticket.
   * Can be used by admins to lookup ticket history or status, even for closed tickets.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction || !interaction.guild) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const id = interaction.options.getString('ticket-id', true)

    // Lookup ticket by exact database ID
    const ticket = await TicketRepository.findById(id)

    if (!ticket) {
      throw new NormalError(
        'Hệ thống không tìm thấy phiếu hỗ trợ này trong cơ sở dữ liệu.'
      )
    }

    const typeLabel = TicketHelper.getTicketTypeLabel(ticket.type)

    const fields = [
      {
        name: 'Mã phiếu',
        value: `${ticket.status === TicketStatus.CLOSED ? '🔒' : '🔓'} **#${ticket.code}**`,
        inline: false
      },
      { name: 'Loại phiếu', value: typeLabel, inline: false },
      { name: 'Người tạo', value: `<@${ticket.requesterId}>`, inline: false },
      {
        name: 'Thời gian tạo',
        value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`,
        inline: false
      }
    ]

    // Conditionally add fields based on ticket status and available data
    // Show channel link only for OPEN tickets as closed tickets might have their channels deleted
    if (ticket.status === TicketStatus.OPEN) {
      fields.push({
        name: 'Kênh hỗ trợ',
        value: `<#${ticket.channelId}>`,
        inline: false
      })
    }

    if (ticket.closedBy) {
      fields.push({
        name: 'Người đóng',
        value: `<@${ticket.closedBy}>`,
        inline: false
      })
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
  }
}
