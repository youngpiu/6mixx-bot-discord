import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { type ButtonInteraction } from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

import {
  TicketListCommand,
  TicketListState,
  decodeState
} from '~/commands/ticket/_ticketListCommand'

export class ButtonTicketListHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    // Determine if this is a ticket list interaction based on custom ID prefix
    // Format: ticket-list:<action>:<encoded_state>
    if (!interaction.customId.startsWith('ticket-list:')) return this.none()

    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const [, action, ...stateParts] = parts
    const encodedState = stateParts.join(':')
    // Decode the state string back into a TicketListState object
    const state = decodeState(encodedState)

    return this.some({ action, state })
  }

  // Delegates handling to the shared logic in TicketListCommand
  public run = asyncInteractionHandler<
    ButtonInteraction,
    { action: string; state: TicketListState }
  >(async (interaction, result) => {
    if (!result) return
    await interaction.deferUpdate() // Ack the interaction to prevent timeout
    await TicketListCommand.handleButton(interaction, result.state)
  })
}
