import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import type { AutocompleteInteraction } from 'discord.js'

import { TicketHelper } from '~/modules/ticket/helpers/TicketHelper'
import { TicketRepository } from '~/modules/ticket/repositories/ticketRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Autocomplete
})
export class AutocompleteTicketHandler extends InteractionHandler {
  public override async run(
    interaction: AutocompleteInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    return interaction.respond(result)
  }

  public override async parse(interaction: AutocompleteInteraction) {
    if (interaction.commandName !== 'ticket') return this.none()
    const focusedOption = interaction.options.getFocused(true)

    if (focusedOption.name !== 'code') return this.none()
    if (!interaction.guild) return this.none()

    const searchedTickets = await TicketRepository.searchByCode({
      guildId: interaction.guild.id,
      search: focusedOption.value
    })

    return this.some(
      searchedTickets.map((ticket) => ({
        name: `${ticket.code} - ${TicketHelper.getStatusText(ticket.status)}`,
        value: ticket.code
      }))
    )
  }
}
