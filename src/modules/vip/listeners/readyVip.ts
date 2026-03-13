import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import type { Client } from 'discord.js'

import { VipSchedulerService } from '~/modules/vip/services/VipSchedulerService'

/**
 * Listener that runs when the client is ready.
 * Syncs BOOSTER VIP for members who were boosting while the bot was offline.
 */
@ApplyOptions<Listener.Options>({
  once: true,
  event: 'clientReady'
})
export class ReadyVipListener extends Listener {
  /**
   * Scans all guilds for active boosters and grants VIP to those without an existing status.
   * @param client The ready client.
   */
  public async run(client: Client<true>) {
    await VipSchedulerService.syncBoosters(client).catch((err) => {
      this.container.logger.error('[ReadyVip] Failed to sync boosters:', err)
    })
  }
}
