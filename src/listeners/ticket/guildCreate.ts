import { Listener } from '@sapphire/framework'
import { Guild } from 'discord.js'

export class GuildCreateListener extends Listener {
  constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'guildCreate'
    })
  }

  public async run(guild: Guild) {
    await this.container.prisma.guild.upsert({
      where: { guildId: guild.id },
      update: {},
      create: {
        guildId: guild.id
      }
    })
    this.container.logger.info(
      `Guild ${guild.name} (${guild.id}) has been created.`
    )
    return
  }
}
