import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

import { DonationDisbursementListCommand } from '~/commands/donate/_disbursementListCommand'

export class ButtonDisbursementListHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId === 'btn-disbursement-list') {
      return this.some({ action: 'init', page: 1 })
    }

    if (!interaction.customId.startsWith('disbursement-list:')) return this.none()

    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const action = parts[1]
    if (action === 'pagination-indicator') return this.none()

    const page = parseInt(parts[2])
    return this.some({ action: 'paginate', page })
  }

  public run = asyncInteractionHandler<ButtonInteraction, { action: string; page: number }>(
    async (interaction, result) => {
      // Manually handle deferral based on action type

      if (!result) return

      if (result.action === 'init') {
        // Initial Load: Send new ephemeral reply
        await DonationDisbursementListCommand.showList(interaction)
      } else {
        // Pagination: Update existing message
        await interaction.deferUpdate()
        await DonationDisbursementListCommand.handleButton(interaction, result.page)
      }
    }
  )
}
