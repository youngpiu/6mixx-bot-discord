import { Listener } from '@sapphire/framework'
import type { GuildMember } from 'discord.js'

import { MemberRepository } from '~/repositories/memberRepository'

export class GuildMemberAddListener extends Listener {
  constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'guildMemberAdd'
    })
  }

  async run(member: GuildMember) {
    // Ignore bots
    if (member.user.bot) return

    try {
      await MemberRepository.createMember({
        guildId: member.guild.id,
        userId: member.user.id
      })

      this.container.logger.debug(
        `Created/verified Member record for ${member.user.tag} in ${member.guild.name}`
      )
    } catch (error) {
      this.container.logger.error(`Failed to create Member record:`, error)
    }
  }
}
