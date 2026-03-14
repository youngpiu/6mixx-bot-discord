import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import type { ButtonInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

import {
  DisbursementListCommand,
  type DisbursementListState,
  decodeState
} from '~/modules/donation/commands/_disbursementListCommand'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonDonationDisbursementList extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId === CUSTOM_ID.BTN_DISBURSEMENT_LIST) {
      return this.some({ page: 1 })
    }

    if (interaction.customId.startsWith(CUSTOM_ID.DISBURSEMENT_LIST_PREFIX)) {
      const parts = interaction.customId
        .slice(CUSTOM_ID.DISBURSEMENT_LIST_PREFIX.length)
        .split(':')
      const state = decodeState(parts[1] || '')
      return this.some(state)
    }

    return this.none()
  }

  public async run(
    interaction: ButtonInteraction,
    state: DisbursementListState
  ) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    await DisbursementListCommand.handleButton(interaction, state)
  }
}
