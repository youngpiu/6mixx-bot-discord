import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import type { AutocompleteInteraction } from 'discord.js'

import { DisbursementRepository } from '~/modules/donation/repositories/disbursementRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Autocomplete
})
export class AutocompleteDisbursementCode extends InteractionHandler {
  public override async run(
    interaction: AutocompleteInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    return interaction.respond(result)
  }

  public override async parse(interaction: AutocompleteInteraction) {
    if (interaction.commandName !== 'disbursement') return this.none()
    const focusedOption = interaction.options.getFocused(true)

    if (focusedOption.name !== 'code') return this.none()
    if (!interaction.guild) return this.none()

    const searchedDisbursements = await DisbursementRepository.searchByCode({
      guildId: interaction.guild.id,
      search: focusedOption.value
    })

    return this.some(
      searchedDisbursements.map((d) => ({
        name: `${d.code} - ${d.amount.toLocaleString('vi-VN')}đ`,
        value: d.code
      }))
    )
  }
}
