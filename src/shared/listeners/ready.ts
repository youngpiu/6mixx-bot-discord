// Listener executed when the bot is ready and logged in
import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import type { Client } from 'discord.js'

import { WordChainService } from '~/modules/word-chain/services/WordChainService'

@ApplyOptions<Listener.Options>({
  once: true,
  event: 'clientReady'
})
export class ReadyListener extends Listener {
  async run(client: Client<true>) {
    const { username, id } = client.user
    this.container.logger.info(`Successfully logged in as ${username} (${id})`)

    // Load Vietnamese WordChain dictionary
    await WordChainService.initViDictionary().catch((err) => {
      this.container.logger.error(
        '[Ready] Failed to load Vietnamese dictionary:',
        err
      )
    })

    // Load English WordChain dictionary
    await WordChainService.initEnDictionary().catch((err) => {
      this.container.logger.error(
        '[Ready] Failed to load English dictionary:',
        err
      )
    })
  }
}
