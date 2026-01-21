import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { type ButtonInteraction } from 'discord.js'
import {
  decodeState,
  TicketListCommand,
  TicketListState
} from '~/commands/ticket/_ticketListCommand'
import { container } from '@sapphire/pieces'
import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { ErrorResponseCore } from '~/core/errorResponse'
import { createErrorEmbed } from '~/utils/embedUtil'

export class ButtonTicketListHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    // Match all ticket-list buttons: ticket-list:<action>:<encoded_state>
    if (!interaction.customId.startsWith('ticket-list:')) return this.none()

    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const [, action, ...stateParts] = parts
    const encodedState = stateParts.join(':')
    const state = decodeState(encodedState)

    return this.some({ action, state })
  }

  public override async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { state } = result as { action: string; state: TicketListState }

    try {
      await TicketListCommand.handleButton(interaction, state)
    } catch (error) {
      let errorEmbed

      if (error instanceof ErrorResponseCore) {
        errorEmbed = createErrorEmbed({
          title: error.title,
          description: error.description
        })
      } else {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.TITLE,
          description: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.DESCRIPTION
        })
      }

      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({ embeds: [errorEmbed] })
      }

      return interaction.reply({ embeds: [errorEmbed], flags: ['Ephemeral'] })
    }
  }
}
