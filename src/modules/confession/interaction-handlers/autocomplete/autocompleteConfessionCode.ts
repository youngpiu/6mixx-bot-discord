// Handler for confession code autocomplete
import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { AutocompleteInteraction } from 'discord.js'

import { ConfessionRepository } from '~/modules/confession/repositories/confessionRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Autocomplete
})
export class AutocompleteConfessionCode extends InteractionHandler {
  public override async parse(interaction: AutocompleteInteraction) {
    if (interaction.commandName !== 'confession') return this.none()

    const focusedOption = interaction.options.getFocused(true)
    if (focusedOption.name !== 'code') return this.none()

    return this.some(focusedOption.value)
  }

  public async run(
    interaction: AutocompleteInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!interaction.guild) return

    const matchValue = result ? String(result).toLowerCase() : ''

    const confessions = await ConfessionRepository.searchByCode(
      interaction.guild.id,
      matchValue
    )

    const choices = confessions.map((cfs) => ({
      name: `${cfs.code} - ${cfs.status === 'APPROVED' ? 'Đã duyệt' : cfs.status === 'PENDING' ? 'Đang chờ duyệt' : 'Đã bị từ chối'}`,
      value: cfs.code
    }))

    await interaction.respond(choices)
  }
}
