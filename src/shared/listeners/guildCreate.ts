import { Listener } from '@sapphire/framework'
import { Guild } from 'discord.js'
import { GuildRepository } from '~/shared/repositories/guildRepository'
import { MemberRepository } from '~/shared/repositories/memberRepository'

export class GuildCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'guildCreate'
    })
  }

  public run = async (guild: Guild) => {
    this.container.logger.info(`Joined guild: ${guild.name} (${guild.id})`)

    await GuildRepository.upsert(guild.id)

    const members = await guild.members.fetch()

    const userMembers = members.filter((m) => !m.user.bot)

    if (userMembers.size === 0) return

    const membersData = userMembers.map((m) => ({
      guildId: guild.id,
      userId: m.id
    }))

    const count = await MemberRepository.createMany(membersData)

    this.container.logger.info(`Synced ${count.count} members for guild ${guild.name}`)
  }
}
