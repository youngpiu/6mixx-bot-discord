// Listener executed when a new member joins; creates or verifies their record in the DB
import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import type { GuildMember } from 'discord.js'

import { GuildMemberRepository } from '~/shared/repositories/guildMemberRepository'

/**
 * Listener that executes when a new member joins a guild.
 * It ensures a record for the user and their guild membership exists in the database.
 */
@ApplyOptions<Listener.Options>({
  event: 'guildMemberAdd'
})
export class GuildMemberAddListener extends Listener {
  /**
   * Responds to a new member joining by creating or verifying their database record.
   * Ignores bot accounts.
   *
   * @param member - The Discord guild member who joined.
   */
  async run(member: GuildMember) {
    // Ignore bots
    if (member.user.bot) return

    try {
      await GuildMemberRepository.create({
        guildId: member.guild.id,
        userId: member.user.id
      })

      this.container.logger.debug(
        `Created/verified GuildMember record for ${member.user.tag} in ${member.guild.name}`
      )
    } catch (error) {
      this.container.logger.error(`Failed to create GuildMember record:`, error)
    }
  }
}
