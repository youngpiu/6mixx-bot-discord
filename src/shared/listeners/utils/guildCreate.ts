// Listener executed on guildCreate event to upsert the guild record in the DB
import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Guild } from 'discord.js'

import { GuildRepository } from '~/shared/repositories/guildRepository'

@ApplyOptions<Listener.Options>({
  event: 'guildCreate'
})
export class GuildCreateListener extends Listener {
  public async run(guild: Guild) {
    await GuildRepository.upsert(guild.id)
    this.container.logger.info(
      `Guild ${guild.name} (${guild.id}) has been created.`
    )
  }
}
