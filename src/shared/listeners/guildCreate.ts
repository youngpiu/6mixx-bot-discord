// Listener executed when the bot joins a new guild; synchronizes guild and members to DB
import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Guild } from 'discord.js'

import { GuildMemberRepository } from '~/shared/repositories/guildMemberRepository'
import { GuildRepository } from '~/shared/repositories/guildRepository'

/**
 * Listener that executes when the bot joins a new guild.
 * It ensures the guild record exists in the database and synchronizes all non-bot members.
 */
@ApplyOptions<Listener.Options>({
  event: 'guildCreate'
})
export class GuildCreateListener extends Listener {
  /**
   * Performs data synchronization when the bot joins a guild.
   * Upserts the guild into the database and bulk-creates records for all human members.
   *
   * @param guild - The Discord guild that was joined.
   */
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

    const count = await GuildMemberRepository.createMany(membersData)

    this.container.logger.info(
      `Synced ${count.count} members for guild ${guild.name}`
    )
  }
}
