import { ApplyOptions, RequiresGuildContext } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { type ButtonInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

import {
  DonationListCommand,
  decodeState
} from '~/modules/donation/commands/_donationListCommand'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonDonationList extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.DONATION_LIST_PREFIX))
      return this.none()

    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const [, action, ...stateParts] = parts
    const encodedState = stateParts.join(':')
    const state = decodeState(encodedState)

    return this.some({ action, state })
  }

  @RequiresGuildContext()
  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    await interaction.deferUpdate()
    const { state } = result
    await DonationListCommand.handleButton(interaction, state)
  }
}
