// Listener executed when the bot is ready and logged in
import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import type { Client } from 'discord.js'

import { VietnameseWordChainService } from '~/modules/vietnamese-word-chain/services/VietnameseWordChainService'

@ApplyOptions<Listener.Options>({
  once: true,
  event: 'clientReady'
})
export class ReadyListener extends Listener {
  async run(client: Client<true>) {
    const { username, id } = client.user
    this.container.logger.info(`Successfully logged in as ${username} (${id})`)

    // Load VietnameseWordChain dictionary
    await VietnameseWordChainService.initDictionary().catch((err) => {
      this.container.logger.error('[Ready] Failed to load dictionary:', err)
    })
  }
}
