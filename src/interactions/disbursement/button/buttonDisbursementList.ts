import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'

import { DonationDisbursementListCommand } from '~/commands/donate/_disbursementListCommand'

export class ButtonDisbursementListHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId === CUSTOM_ID.BTN_DISBURSEMENT_LIST) {
      return this.some({ action: 'init', page: 1 })
    }

    if (!interaction.customId.startsWith(CUSTOM_ID.DISBURSEMENT_LIST_PREFIX)) return this.none()

    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const action = parts[1]
    if (action === 'pagination-indicator') return this.none()

    const page = parseInt(parts[2])
    return this.some({ action: 'paginate', page })
  }

  public async run(interaction: ButtonInteraction, result: InteractionHandler.ParseResult<this>) {
    if (!result) return

    const { action, page } = result as { action: string; page: number }

    if (action === 'init') {
      await DonationDisbursementListCommand.showList(interaction)
    } else {
      await interaction.deferUpdate()
      await DonationDisbursementListCommand.handleButton(interaction, page)
    }
  }
}
