import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { TicketHelper } from '~/helpers/TicketHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

export class ButtonTicketReportHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-ticket-report') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) =>
    TicketHelper.createTicket({
      interaction,
      type: 'REPORT',
      description: 'Vui lòng mô tả chi tiết về báo cáo của bạn.'
    })
  )
}
