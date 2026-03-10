import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import type { AutocompleteInteraction } from 'discord.js'

import { DonationHelper } from '~/modules/donation/helpers/DonationHelper'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Autocomplete
})
export class AutocompleteDonationCode extends InteractionHandler {
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
    if (!interaction.guild) return this.none()

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
