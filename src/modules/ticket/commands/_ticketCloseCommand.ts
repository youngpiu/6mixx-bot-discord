import { ChatInputCommandInteraction, TextChannel } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'
import { GuildRepository } from '~/modules/ticket/repositories/guildRepository'
import { TicketRepository } from '~/modules/ticket/repositories/ticketRepository'

export class TicketCloseCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const reason = interaction.options.getString('reason')
    const channel = interaction.channel as TextChannel
    const closedById = interaction.user.id
    const guildId = interaction.guild!.id

    const [ticket, ticketConfig] = await Promise.all([
      TicketRepository.findByChannelId(channel.id),
      GuildRepository.getConfig(guildId)
    ])

    if (!ticket) {
      throw new NormalError(
        'Không tìm thấy phiếu hỗ trợ nào liên kết với kênh này.'
      )
    }

    if (ticket.status === 'CLOSED') {
      throw new NormalError('Phiếu hỗ trợ này đã được đóng trước đó rồi.')
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
