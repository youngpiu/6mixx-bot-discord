import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { ChannelType, type Client, Events } from 'discord.js'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'

/**
 * Listener that runs when the client is ready.
 * Synchronizes temporary voice channels by deleting empty ones and clearing outdated records.
 */
@ApplyOptions<Listener.Options>({
  once: true,
  event: Events.ClientReady
})
export class ClientReadyListener extends Listener {
  /**
   * Checks and cleans up all active temporary voice channels on startup.
   * @param client The ready client.
   */
  public async run(client: Client<true>) {
    const records = await TempVoiceProfileRepository.listAllActive()
    if (records.length === 0) return

    for (const record of records) {
      const guild = client.guilds.cache.get(record.guildId)
      const channel = guild?.channels.cache.get(record.channelId!)

      if (!channel || channel.type !== ChannelType.GuildVoice) {
        if (record.channelId) {
          await TempVoiceProfileRepository.clearActiveChannelById(
            record.channelId
          ).catch(() => null)
        }
        continue
      }

      if (channel.members.size === 0) {
        await channel.delete().catch(() => null)
        if (record.channelId) {
          await TempVoiceProfileRepository.clearActiveChannelById(
            record.channelId
          ).catch(() => null)
        }
      }
    }
  }
}
