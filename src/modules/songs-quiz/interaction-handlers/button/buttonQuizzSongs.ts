import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { type ButtonInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

import {
  MusicQuizSongsCommand,
  decodeSongsState
} from '~/modules/songs-quiz/commands/_quizzSongsCommand'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonMusicQuizSongs extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.MUSIC_QUIZ_SONGS_PREFIX))
      return this.none()

    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const [, , encodedState] = parts
    const state = decodeSongsState(encodedState)

    return this.some({ state })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    await interaction.deferUpdate()
    const { state } = result
    await MusicQuizSongsCommand.handleButton(interaction, state)
  }
}
