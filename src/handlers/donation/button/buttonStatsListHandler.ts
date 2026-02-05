import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

import { DonationStatsCommand } from '~/commands/donate/_donationStatsCommand'

export class ButtonStatsListHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('btn-stats-list:')) return this.none()

    // Format: btn-stats-list:action:page
    const parts = interaction.customId.split(':')
    const page = parseInt(parts[2], 10) || 1
    return this.some(page)
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction, page) => {
    await DonationStatsCommand.handleShowList(interaction, page as number)
  })
}
