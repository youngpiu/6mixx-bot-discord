import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { type ButtonInteraction } from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

import {
  DonationListCommand,
  DonationListState,
  decodeState
} from '~/commands/donate/_donationListCommand'

export class ButtonDonationListHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    // Match all donation-list buttons: donation-list:<action>:<encoded_state>
    if (!interaction.customId.startsWith('donation-list:')) return this.none()

    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const [, action, ...stateParts] = parts
    const encodedState = stateParts.join(':')
    const state = decodeState(encodedState)

    return this.some({ action, state })
  }

  public run = asyncInteractionHandler<
    ButtonInteraction,
    { action: string; state: DonationListState }
  >(async (interaction, result) => {
    if (!result) return
    await DonationListCommand.handleButton(interaction, result.state)
  })
}
