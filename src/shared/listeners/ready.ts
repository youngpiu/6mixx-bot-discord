// Listener executed when the bot is ready and logged in
import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import type { Client } from 'discord.js'

@ApplyOptions<Listener.Options>({
  once: true,
  event: 'clientReady'
})
export class ReadyListener extends Listener {
  run(client: Client<true>) {
    const { username, id } = client.user
    this.container.logger.info(`Successfully logged in as ${username} (${id})`)
  }
}
