import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ModalSubmitInteraction, ThreadChannel } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'

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

  public run = asyncInteractionHandler<ModalSubmitInteraction>(async (interaction) => {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const thread = interaction.channel
    if (!thread || !thread.isThread()) {
      throw new BadRequestError({
        description: 'Lệnh này chỉ có thể sử dụng trong một thread phiếu hỗ trợ.'
      })
    }

    const reason = interaction.fields.getTextInputValue('reason')

    await TicketHelper.closeTicket({
      thread: thread as ThreadChannel,
      closedById: interaction.user.id,
      guildId: interaction.guildId,
      reason
    })

    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.IMMEDIATE)
  })
}
