import { Listener } from '@sapphire/framework'
import { Guild } from 'discord.js'

import { GuildRepository } from '~/repositories/guildRepository'
import { MemberRepository } from '~/repositories/memberRepository'

export class GuildCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'guildCreate'
    })
  }

  public async run(guild: Guild) {
    this.container.logger.info(`Joined guild: ${guild.name} (${guild.id})`)

    try {
      await GuildRepository.getOrCreate(guild.id)

      const members = await guild.members.fetch()

      const userMembers = members.filter((m) => !m.user.bot)

      if (userMembers.size === 0) return

      const membersData = userMembers.map((m) => ({
        guildId: guild.id,
        userId: m.id
      }))

      const count = await MemberRepository.createMembers(membersData)

      this.container.logger.info(`Synced ${count.count} members for guild ${guild.name}`)
    } catch (error) {
      this.container.logger.error(`Error syncing members for guild ${guild.name}:`, error)
    }
  }
}
