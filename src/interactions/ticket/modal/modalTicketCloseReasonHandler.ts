import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ChannelType, ModalSubmitInteraction, TextChannel } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { BadRequestError, GuildOnlyError } from '~/core/errorResponse'

import { TicketHelper } from '~/helpers/TicketHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

export class ModalTicketCloseReasonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== 'modal-ticket-close-reason') return this.none()
    return this.some()
  }

  // Processes the closure reason submitted via modal
  public run = asyncInteractionHandler<ModalSubmitInteraction>(async (interaction) => {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new GuildOnlyError()
    }

    const channel = interaction.channel
    // Ensure command is run within a text channel (the ticket channel)
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new BadRequestError({
        description: 'Lệnh này chỉ có thể sử dụng trong kênh phiếu hỗ trợ.'
      })
    }

    const reason = interaction.fields.getTextInputValue('reason')

    // Close the ticket with the provided reason
    await TicketHelper.closeTicket({
      channel: channel as TextChannel,
      closedById: interaction.user.id,
      guildId: interaction.guildId,
      reason
    })

    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.IMMEDIATE)
  })
}
