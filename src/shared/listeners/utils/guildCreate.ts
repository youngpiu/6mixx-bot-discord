// Listener executed on guildCreate event to upsert the guild record in the DB
import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Guild } from 'discord.js'

import { GuildRepository } from '~/shared/repositories/guildRepository'

/**
 * Listener that executes when the bot joins a new guild.
 * Minimal version that just ensures the guild record exists in the database.
 */
@ApplyOptions<Listener.Options>({
  event: 'guildCreate'
})
export class GuildCreateListener extends Listener {
  /**
   * Upserts the guild record into the database and logs the join event.
   *
   * @param guild - The Discord guild that was joined.
   */
  public async run(guild: Guild) {
    await GuildRepository.upsert(guild.id)
    this.container.logger.info(
      `Guild ${guild.name} (${guild.id}) has been created.`
    )
  }
}
