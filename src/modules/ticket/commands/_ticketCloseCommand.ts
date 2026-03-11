// Command to close a ticket from within the ticket channel
import { ChatInputCommandInteraction, TextChannel } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'
import { GuildRepository } from '~/modules/ticket/repositories/guildRepository'
import { TicketRepository } from '~/modules/ticket/repositories/ticketRepository'

export class TicketCloseCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) return

    const reason = interaction.options.getString('reason')
    const channel = interaction.channel as TextChannel
    const closedById = interaction.user.id
    const guildId = interaction.guild.id

    const [ticket, ticketConfig] = await Promise.all([
      TicketRepository.findByChannelId(channel.id),
      GuildRepository.getConfig(guildId)
    ])

    if (!ticket) {
      throw new NormalError(
        'Không tìm thấy phiếu hỗ trợ nào được liên kết với kênh này, vui lòng kiểm tra lại cơ sở dữ liệu.'
      )
    }

    if (ticket.status === 'CLOSED') {
      throw new NormalError(
        'Không thể đóng phiếu hỗ trợ đã đóng trước đó, vui lòng bỏ qua lệnh này.'
      )
    }

    // Run log sending and DB update in parallel for better performance
    await Promise.all([
      TicketHelper.sendTicketLog({
        guildId,
        ticket,
        event: 'CLOSED',
        executorId: closedById,
        reason,
        ticketConfig // Pass config to avoid duplicate fetch optimization
      }),
      TicketRepository.close({
        id: ticket.id,
        closedBy: closedById,
        reason
      })
    ])

    // Delete the channel immediately
    await channel.delete()
  }
}
