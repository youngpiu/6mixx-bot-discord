// Listener executed when the bot is ready and logged in
import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { type Client, Events } from 'discord.js'

import { GuildMemberSyncService } from '~/shared/services/guildMemberSyncService'

import { VipSchedulerService } from '~/modules/vip/services/VipSchedulerService'
import { WordChainRedisService } from '~/modules/word-chain/services/WordChainRedisService'
import { WordChainService } from '~/modules/word-chain/services/WordChainService'

/**
 * Listener that executes once when the client has finished logging in and is ready.
 * Handles initial setup tasks like preloading scripts, initializing dictionaries,
 * syncing guild members, and running VIP checks.
 *
 * NOTE: Guild member sync must complete before VIP booster sync to satisfy
 * foreign key constraints (VipStatus requires GuildMember to exist).
 */
@ApplyOptions<Listener.Options>({
  once: true,
  event: Events.ClientReady
})
export class ReadyListener extends Listener {
  /**
   * Executes initial startup logic.
   *
   * @param client - The connected Discord client.
   */
  async run(client: Client<true>) {
    const { username, id } = client.user
    this.container.logger.info(`Successfully logged in as ${username} (${id})`)

    // Step 1: Tasks that don't depend on guild members being in the DB
    await Promise.all([
      WordChainRedisService.preloadSubmitScripts().catch((err) => {
        this.container.logger.error(
          '[Ready] Failed to preload Lua scripts:',
          err
        )
      }),
      WordChainService.initViDictionary().catch((err) => {
        this.container.logger.error(
          '[Ready] Failed to load Vietnamese dictionary:',
          err
        )
      }),
      WordChainService.initEnDictionary().catch((err) => {
        this.container.logger.error(
          '[Ready] Failed to load English dictionary:',
          err
        )
      }),
      // Sync guild members first so FK constraints are satisfied for VIP sync
      GuildMemberSyncService.syncAllGuilds(client).catch((err) => {
        this.container.logger.error(
          '[Ready] Failed to sync guild members:',
          err
        )
      })
    ])

    // Step 2: VIP tasks run after guild members are synced to DB
    await Promise.all([
      VipSchedulerService.runChecks().catch((err) => {
        this.container.logger.error(
          '[Ready] Failed to run VIP startup checks:',
          err
        )
      }),
      VipSchedulerService.syncBoosters(client).catch((err) => {
        this.container.logger.error('[Ready] Failed to sync booster VIPs:', err)
      })
    ])
  }
}
