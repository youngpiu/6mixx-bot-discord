// Command to close a ticket from within the ticket channel
import { ChatInputCommandInteraction, TextChannel } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'

export class TicketCloseCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const reason = interaction.options.getString('reason')

    await TicketHelper.closeTicket({
      channel: interaction.channel as TextChannel,
      closedById: interaction.user.id,
      guildId: interaction.guild.id,
      reason
    })

    await interaction.deleteReply()
  }
}
