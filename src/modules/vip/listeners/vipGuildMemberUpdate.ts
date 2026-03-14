import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Events, GuildMember } from 'discord.js'

import { VipRepository } from '~/modules/vip/repositories/vipRepository'
import { VipService } from '~/modules/vip/services/VipService'

@ApplyOptions<Listener.Options>({
  event: Events.GuildMemberUpdate
})
export class VipGuildMemberUpdateListener extends Listener {
  public override async run(oldMember: GuildMember, newMember: GuildMember) {
    const wasBoosting = !!oldMember.premiumSince
    const isBoosting = !!newMember.premiumSince

    const guildId = newMember.guild.id
    const userId = newMember.id

    // Stopped boosting → auto-revoke nếu type là BOOSTER
    if (wasBoosting && !isBoosting) {
      const vipStatus = await VipRepository.findStatus(guildId, userId)
      if (vipStatus && vipStatus.type === 'BOOSTER') {
        await VipService.revokeVip(newMember.guild, userId)
        this.container.logger.info(
          `[VipListener] Revoked BOOSTER VIP from ${newMember.user.tag} (${userId}) as they stopped boosting`
        )
      }
    }
  }
}
