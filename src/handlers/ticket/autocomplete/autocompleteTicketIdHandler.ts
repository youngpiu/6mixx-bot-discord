import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import type { AutocompleteInteraction } from 'discord.js'
import { TicketRepository } from '~/repositories/ticketRepository'

export class AutocompleTicketHandler extends InteractionHandler {
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

    if (focusedOption.name !== 'ticket-id') return this.none()
    if (!interaction.guildId) return this.none()
    const searchedTickets = await TicketRepository.searchByCode({
      guildId: interaction.guildId,
      search: focusedOption.value
    })
    return this.some(
      searchedTickets.map((ticket) => ({
        name: ticket.code,
        value: ticket.id
      }))
    )
  }
}
