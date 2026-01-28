import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import type { AutocompleteInteraction } from 'discord.js'

import { DonateRepository } from '~/repositories/donateRepository'

export class AutocompleteDonationCodeHandler extends InteractionHandler {
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
    if (interaction.commandName !== 'donation') return this.none()
    const focusedOption = interaction.options.getFocused(true)

    if (focusedOption.name !== 'code') return this.none()
    if (!interaction.guildId) return this.none()

    const searchedDonations = await DonateRepository.searchByCode({
      guildId: interaction.guildId,
      search: focusedOption.value
    })

    return this.some(
      searchedDonations.map((donation) => ({
        name: `${donation.code} - ${donation.amount.toLocaleString('vi-VN')}đ (${donation.donor.donorCode || 'N/A'})`,
        value: donation.code
      }))
    )
  }
}
