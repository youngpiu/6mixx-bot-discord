import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Events, Role } from 'discord.js'

import { VipRepository } from '~/modules/vip/repositories/vipRepository'

@ApplyOptions<Listener.Options>({
  event: Events.GuildRoleDelete
})
export class VipGuildRoleDeleteListener extends Listener {
  public override async run(role: Role) {
    const guildId = role.guild.id
    const roleId = role.id

    // Check if this deleted role was a VIP custom role
    const customRole = await VipRepository.findCustomRoleByRoleId(roleId)
    if (!customRole) return

    // If it was, remove the entry from Database
    await VipRepository.deleteCustomRoleByRoleId(roleId)

    this.container.logger.info(
      `[VipListener] Custom VIP role ${roleId} was manually deleted in guild ${guildId}. Database entry cleaned up.`
    )
  }
}
