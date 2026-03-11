import { type ChatInputCommandInteraction, type InteractionEditReplyOptions, MessageFlags, Colors, ButtonBuilder, ButtonStyle } from 'discord.js'

import { TicketStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

import { DetailBuilder } from '~/shared/components/DetailBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'

import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'
import { TicketRepository } from '~/modules/ticket/repositories/ticketRepository'

export class TicketDetailCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction.guild) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const code = interaction.options.getString('code', true)

    const ticket = await TicketRepository.findByCode(code)

    if (!ticket) {
      throw new NormalError(
        'Hệ thống không tìm thấy phiếu hỗ trợ này trong cơ sở dữ liệu.'
      )
    }

    const typeLabel = TicketHelper.getTicketTypeLabel(ticket.type)
    const statusLabel = TicketHelper.getStatusText(ticket.status)

    const fields: [string, string][] = [
      ['Trạng thái', `**${statusLabel}**`],
      ['Loại phiếu', `**${typeLabel}**`],
      ['Người tạo', `<@${ticket.requesterId}>`]
    ]

    // Show channel link only for OPEN tickets as closed tickets might have their channels deleted
    if (ticket.status === TicketStatus.OPEN) {
      fields.push(['Kênh hỗ trợ', `<#${ticket.channelId}>`])
    }

    fields.push([
      'Thời gian tạo',
      `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`
    ])

    if (ticket.closedBy) {
      fields.push(['Người đóng', `<@${ticket.closedBy}>`])
    }

    if (ticket.closedAt) {
      fields.push([
        'Thời gian đóng',
        `<t:${Math.floor(ticket.closedAt.getTime() / 1000)}:R>`
      ])
    }

    if (ticket.reason) {
      fields.push(['Lý do đóng', `**${ticket.reason}**`])
    }

    const builder = new DetailBuilder({
      title: `Thông tin phiếu hỗ trợ \`#${ticket.code}\``,
      color: ticket.status === TicketStatus.CLOSED ? Colors.Red : Colors.Green
    }).addFields(fields)

    const btnDelete = new ButtonBuilder()
      .setCustomId(`${CUSTOM_ID.BTN_TICKET_DELETE_PREFIX}${ticket.id}`)
      .setLabel('Xóa')
      .setStyle(ButtonStyle.Danger)

    builder.addActionRow([btnDelete])

    const response: InteractionEditReplyOptions = {
      components: builder.build(),
      flags: [MessageFlags.IsComponentsV2]
    }

    await interaction.editReply(response)
  }
}
