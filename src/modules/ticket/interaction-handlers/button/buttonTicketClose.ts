// Handler for closing a ticket without a reason
import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction, TextChannel } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonTicketClose extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (
      interaction.customId !== CUSTOM_ID.BTN_TICKET_CLOSE ||
      !interaction.memberPermissions?.has('Administrator')
    )
      return this.none()
    return this.some()
  }

  public async run(interaction: ButtonInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild)
      throw new NormalError('Lệnh này chỉ dùng trong máy chủ.')

    await TicketHelper.closeTicket({
      channel: interaction.channel as TextChannel,
      closedById: interaction.user.id,
      guildId: interaction.guild.id
    })

    await interaction.deleteReply()
  }
}
