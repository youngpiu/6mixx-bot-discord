import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Events, GuildMember } from 'discord.js'

import { VipRepository } from '~/modules/vip/repositories/vipRepository'
import { VipService } from '~/modules/vip/services/VipService'

@ApplyOptions<Listener.Options>({
  event: Events.GuildMemberUpdate
})
export class GuildMemberUpdateListener extends Listener {
  public override async run(oldMember: GuildMember, newMember: GuildMember) {
    const wasBoosting = !!oldMember.premiumSince
    const isBoosting = !!newMember.premiumSince

    const guildId = newMember.guild.id
    const userId = newMember.id

    // 1. Started boosting
    if (!wasBoosting && isBoosting) {
      // Check if already has VIP
      const vipStatus = await VipRepository.findStatus(guildId, userId)
      if (!vipStatus) {
        // Automatically grant BOOSTER VIP
        await VipService.grantVip(newMember, 'BOOSTER')
        this.container.logger.info(
          `[VipListener] Automatically granted BOOSTER VIP to ${newMember.user.tag} (${userId})`
        )
      }
    }

    // 2. Stopped boosting
    if (wasBoosting && !isBoosting) {
      // Check if current VIP is BOOSTER type
      const vipStatus = await VipRepository.findStatus(guildId, userId)
      if (vipStatus && vipStatus.type === 'BOOSTER') {
        // Revoke VIP (role will be kept for 7 days)
        await VipService.revokeVip(newMember.guild, userId)
        this.container.logger.info(
          `[VipListener] Revoked BOOSTER VIP from ${newMember.user.tag} (${userId}) as they stopped boosting`
        )
      }
    }
  }
}
