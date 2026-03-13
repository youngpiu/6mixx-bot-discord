import { container } from '@sapphire/pieces'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'

/**
 * Service for transferring ownership of an active temporary voice channel.
 */
export class TempVoiceTransferService {
  /**
   * Transfers ownership of an active voice channel to a new user.
   * Handles cleaning up any existing channels owned by the new owner and updating profiles.
   * @param channelId The ID of the voice channel being transferred.
   * @param guildId The ID of the guild.
   * @param newOwnerId The ID of the user becoming the new owner.
   * @returns The previous owner's ID, or null if profile not found.
   */
  public static async transferActiveChannel(
    channelId: string,
    guildId: string,
    newOwnerId: string
  ) {
    const current = await TempVoiceProfileRepository.findByChannelId(channelId)
    if (!current) return null

    // 1 & 2. Clear old owner active channel and find new owner profile in parallel
    const [, newOwnerProfile] = await Promise.all([
      TempVoiceProfileRepository.clearActiveChannelById(channelId),
      TempVoiceProfileRepository.findByOwnerId(guildId, newOwnerId)
    ])

    if (newOwnerProfile?.channelId && newOwnerProfile.channelId !== channelId) {
      const guild = container.client.guilds.cache.get(guildId)
      const oldChannel = guild?.channels.cache.get(newOwnerProfile.channelId)
      if (oldChannel && oldChannel.isVoiceBased()) {
        if (oldChannel.members.size === 0) {
          await oldChannel.delete().catch(() => null)
        }
      }
    }

    // 3. Assign the new channel to the new owner
    await TempVoiceProfileRepository.setActiveChannel(
      guildId,
      newOwnerId,
      channelId
    )

    return { previousOwnerId: current.ownerId }
  }
}
