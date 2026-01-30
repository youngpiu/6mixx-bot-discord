import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, ThreadChannel } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { TicketHelper } from '~/helpers/TicketHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { hasAdministratorPermission } from '~/utils/permissionUtil'

export class ButtonTicketCloseHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-ticket-close' || !hasAdministratorPermission(interaction))
      return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) return

    await TicketHelper.closeTicket({
      thread: interaction.channel as ThreadChannel,
      closedById: interaction.user.id,
      guildId: interaction.guildId
    })

    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.IMMEDIATE)
  })
}
