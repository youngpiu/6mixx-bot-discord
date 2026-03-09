import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { type ButtonInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'

import {
  DonationListCommand,
  DonationListState,
  decodeState
} from '~/commands/donate/_donationListCommand'

export class ButtonDonationList extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.DONATION_LIST_PREFIX)) return this.none()

    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const [, action, ...stateParts] = parts
    const encodedState = stateParts.join(':')
    const state = decodeState(encodedState)

    return this.some({ action, state })
  }

  public async run(interaction: ButtonInteraction, result: InteractionHandler.ParseResult<this>) {
    if (!result) return
    await interaction.deferUpdate()
    const { state } = result as { action: string; state: DonationListState }
    await DonationListCommand.handleButton(interaction, state)
  }
}
