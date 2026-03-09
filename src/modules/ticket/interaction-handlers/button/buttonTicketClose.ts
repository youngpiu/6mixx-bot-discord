import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, TextChannel } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'

export class ButtonTicketClose extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

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

    if (!interaction || !interaction.guild)
      throw new NormalError('Lệnh này chỉ dùng trong máy chủ.')

    await TicketHelper.closeTicket({
      channel: interaction.channel as TextChannel,
      closedById: interaction.user.id,
      guildId: interaction.guild.id
    })

    await interaction.deleteReply()
  }
}
