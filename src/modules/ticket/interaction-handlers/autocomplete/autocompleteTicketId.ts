import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import type { AutocompleteInteraction } from 'discord.js'

import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'

import { TicketRepository } from '~/modules/ticket/repositories/ticketRepository'

export class AutocompleteTicketHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Autocomplete
    })
  }

  public override async run(
    interaction: AutocompleteInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    return interaction.respond(result)
  }

  public override async parse(interaction: AutocompleteInteraction) {
    if (interaction.commandName !== 'ticket') return this.none()
    const focusedOption = interaction.options.getFocused(true)

    // Only handle autocompletion for ticket-id option
    if (focusedOption.name !== 'ticket-id') return this.none()
    if (!interaction || !interaction.guild) return this.none()

    // Search tickets by code provided in input
    const searchedTickets = await TicketRepository.searchByCode({
      guildId: interaction.guild.id,
      search: focusedOption.value
    })

    return this.some(
      searchedTickets.map((ticket) => ({
        name: `${ticket.code} - ${TicketHelper.getStatusText(ticket.status)}`,
        value: ticket.id
      }))
    )
  }
}
