import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

import { ExpenseListCommand } from '~/commands/expense/_expenseListCommand'

export class ButtonExpenseListHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('expense-list:')) return this.none()

    // Format: expense-list:action:page
    const parts = interaction.customId.split(':')
    const page = parseInt(parts[2], 10) || 1
    return this.some(page)
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction, page) => {
    await ExpenseListCommand.handleButton(interaction, page as number)
  })
}
