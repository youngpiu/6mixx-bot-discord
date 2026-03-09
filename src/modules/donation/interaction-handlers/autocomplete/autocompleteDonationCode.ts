import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import type { AutocompleteInteraction } from 'discord.js'

import { DonationHelper } from '~/modules/donation/helpers/DonationHelper'

import { DonateRepository } from '~/modules/donation/repositories/donateRepository'

export class AutocompleteDonationCode extends InteractionHandler {
  /**
   * Handles autocomplete for donation codes.
   * Filters donations based on user input.
   */
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
    if (!interaction || !interaction.guild) return this.none()

    const searchedDonations = await DonateRepository.searchByCode({
      guildId: interaction.guild.id,
      search: focusedOption.value
    })

    return this.some(
      searchedDonations.map((donation) => ({
        name: `${donation.code} - ${donation.amount.toLocaleString('vi-VN')}đ - ${DonationHelper.getStatusText(donation.status)}`,
        value: donation.code
      }))
    )
  }
}
