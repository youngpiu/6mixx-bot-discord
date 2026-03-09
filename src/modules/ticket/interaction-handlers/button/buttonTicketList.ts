// Handler for navigating through the paginated ticket list
import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { type ButtonInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

import {
  TicketListCommand,
  decodeState
} from '~/modules/ticket/commands/_ticketListCommand'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonTicketList extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.TICKET_LIST_PREFIX))
      return this.none()

    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const [, action, ...stateParts] = parts
    const encodedState = stateParts.join(':')
    const state = decodeState(encodedState)

    return this.some({ action, state })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    await interaction.deferUpdate()
    const { state } = result
    await TicketListCommand.handleButton(interaction, state)
  }
}
