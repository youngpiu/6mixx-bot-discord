import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { type ButtonInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

import { MusicQuizTopCommand, decodeState } from '../commands/_quizzTopCommand'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonMusicQuizTop extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.MUSIC_QUIZ_TOP_PREFIX))
      return this.none()

    const parts = interaction.customId.split(':')
    if (parts.length < 2) return this.none()

    const [, encodedState] = parts
    const state = decodeState(encodedState)

    return this.some({ state })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    await interaction.deferUpdate()
    const { state } = result
    await MusicQuizTopCommand.handleButton(interaction, state)
  }
}
