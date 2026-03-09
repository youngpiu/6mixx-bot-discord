import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ChannelType, ModalSubmitInteraction, TextChannel } from 'discord.js'
import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'
import { CUSTOM_ID } from '~/shared/constants/idConstant'

import { NormalError } from '~/core/errorResponse'

export class ModalTicketCloseReason extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_TICKET_CLOSE_REASON)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction || !interaction.guild) {
      throw new NormalError('Lệnh này chỉ dùng trong máy chủ.')
    }

    const channel = interaction.channel
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new NormalError(
        'Lệnh này chỉ có thể sử dụng trong kênh phiếu hỗ trợ.'
      )
    }

    const reason = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT_REASON)

    await TicketHelper.closeTicket({
      channel: channel as TextChannel,
      closedById: interaction.user.id,
      guildId: interaction.guild.id,
      reason
    })

    await interaction.deleteReply()
  }
}
