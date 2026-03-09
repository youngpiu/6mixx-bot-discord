import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'

import { DisbursementListCommand, decodeState } from '~/commands/donate/_disbursementListCommand'

export class ButtonDisbursementList extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.DISBURSEMENT_LIST_PREFIX)) return this.none()

    const remainder = interaction.customId.slice(CUSTOM_ID.DISBURSEMENT_LIST_PREFIX.length)
    const [action, encodedState] = remainder.split(':')

    if (!action || !encodedState) return this.none()

    return this.some({ action, state: decodeState(encodedState) })
  }

  public async run(
    interaction: ButtonInteraction,
    parsedData: InteractionHandler.ParseResult<this>
  ) {
    const { state } = parsedData

    await interaction.deferUpdate()
    await DisbursementListCommand.handleButton(interaction, state)
  }
}
