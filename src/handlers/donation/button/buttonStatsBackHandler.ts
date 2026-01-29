import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

import { DonationStatsCommand } from '~/commands/donate/_donationStatsCommand'

export class ButtonStatsBackHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-stats-back') return this.none()

    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    await DonationStatsCommand.handleShowStats(interaction)
  })
}
