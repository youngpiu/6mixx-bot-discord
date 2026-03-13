import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { Channel, Events } from 'discord.js'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'

/**
 * Listener that handles the manual deletion of voice channels.
 * Clears the active channel record if the deleted channel was a temporary voice channel.
 */
@ApplyOptions<Listener.Options>({
  event: Events.ChannelDelete
})
export class VoiceChannelDeleteListener extends Listener {
  /**
   * Cleans up database records when a voice channel is deleted.
   * @param channel The channel that was deleted.
   */
  public async run(channel: Channel) {
    const record = await TempVoiceProfileRepository.findByChannelId(channel.id)
    if (!record) return

    await TempVoiceProfileRepository.clearActiveChannelById(channel.id).catch(
      () => null
    )
  }
}
