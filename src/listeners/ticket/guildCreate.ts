import { Listener } from '@sapphire/framework'
import { Guild } from 'discord.js'
import { GuildRepository } from '~/repositories/guildRepository'

export class GuildCreateListener extends Listener {
  constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'guildCreate'
    })
  }

  public async run(guild: Guild) {
    await GuildRepository.createGuild({ guildId: guild.id })
    this.container.logger.info(
      `Guild ${guild.name} (${guild.id}) has been created.`
    )
    return
  }
}
