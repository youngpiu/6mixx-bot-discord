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
 * syncing guild members, and running VIP expiration/cleanup checks.
 */
@ApplyOptions<Listener.Options>({
  event: Events.ClientReady
})
export class SharedClientReadyListener extends Listener {
  /**
   * Executes initial startup logic.
   * Guarded by a static flag to ensure it only runs once even without `once: true`.
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
      // Sync guild members to satisfy FK constraints for other modules
      GuildMemberSyncService.syncAllGuilds(client).catch((err) => {
        this.container.logger.error(
          '[Ready] Failed to sync guild members:',
          err
        )
      })
    ])

    // Step 2: Recover any VIP expirations/cleanups that happened while bot was offline
    await VipSchedulerService.runChecks().catch((err) => {
      this.container.logger.error(
        '[Ready] Failed to run VIP startup checks:',
        err
      )
    })
  }
}
