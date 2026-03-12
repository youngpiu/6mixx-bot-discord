// Listener executed when the bot is ready and logged in
import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import type { Client } from 'discord.js'

import { WordChainRedisService } from '~/modules/word-chain/services/WordChainRedisService'
import { WordChainService } from '~/modules/word-chain/services/WordChainService'

@ApplyOptions<Listener.Options>({
  once: true,
  event: 'clientReady'
})
export class ReadyListener extends Listener {
  async run(client: Client<true>) {
    const { username, id } = client.user
    this.container.logger.info(`Successfully logged in as ${username} (${id})`)

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
      })
    ])
  }
}
