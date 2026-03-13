import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { type ButtonInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

import {
  ConfessionListCommand,
  decodeState
} from '~/modules/confession/commands/_confessionListCommand'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonConfessionList extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.CONFESSION_LIST_PREFIX))
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
    await ConfessionListCommand.handleButton(interaction, state)
  }
}
