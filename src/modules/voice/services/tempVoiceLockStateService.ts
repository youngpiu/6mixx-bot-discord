import { type VoiceChannel } from 'discord.js'

/**
 * Service for checking the lock status of a voice channel.
 */
export class TempVoiceLockStateService {
  /**
   * Checks if the voice channel is locked (Connect permission denied for @everyone).
   * @param channel The voice channel to check.
   * @returns True if the channel is locked, false otherwise.
   */
  public static get(channel: VoiceChannel) {
    const overwrite = channel.permissionOverwrites.cache.get(
      channel.guild.roles.everyone.id
    )
    return overwrite?.deny?.has('Connect') ?? false
  }
}
