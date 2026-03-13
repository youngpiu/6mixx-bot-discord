import { container } from '@sapphire/pieces'

import { TempVoiceProfile } from 'generated/prisma/client'

import { TempVoiceCacheService } from '~/modules/voice/services/tempVoiceCacheService'

/**
 * Repository for managing temporary voice channel profiles.
 * Profiles store user preferences and the current active channel for each owner.
 */
export class TempVoiceProfileRepository {
  /**
   * Finds a temporary voice profile by the associated channel ID.
   * @param channelId The ID of the voice channel.
   * @returns The profile if found, otherwise null.
   */
  public static async findByChannelId(channelId: string) {
    return TempVoiceCacheService.rememberChannelProfile(channelId, async () => {
      return container.prisma.tempVoiceProfile.findUnique({
        where: { channelId }
      })
    })
  }

  /**
   * Finds a temporary voice profile by guild ID and owner ID.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @returns The profile if found, otherwise null.
   */
  public static async findByOwnerId(guildId: string, ownerId: string) {
    return TempVoiceCacheService.rememberOwnerProfile(
      guildId,
      ownerId,
      async () => {
        return container.prisma.tempVoiceProfile.findUnique({
          where: { guildId_ownerId: { guildId, ownerId } }
        })
      }
    )
  }

  /**
   * Lists all active temporary voice profiles (those with an existing channel).
   * @returns A list of active profiles.
   */
  public static async listAllActive() {
    return container.prisma.tempVoiceProfile.findMany({
      where: { channelId: { not: null, notIn: [''] } }
    }) as Promise<
      (TempVoiceProfile & {
        channelId: string
      })[]
    >
  }

  /**
   * Creates a new profile or returns the existing one for an owner.
   * @param data The profile data.
   * @param data.guildId The ID of the guild.
   * @param data.ownerId The ID of the channel owner.
   * @param data.name The default name for the channel.
   * @returns The upserted profile.
   */
  public static async upsertProfile(data: {
    guildId: string
    ownerId: string
    name: string
  }) {
    const result = await container.prisma.tempVoiceProfile.upsert({
      where: {
        guildId_ownerId: { guildId: data.guildId, ownerId: data.ownerId }
      },
      create: {
        guildId: data.guildId,
        ownerId: data.ownerId,
        name: data.name
      },
      update: {}
    })

    await TempVoiceCacheService.invalidateProfileFull(
      data.guildId,
      data.ownerId,
      result.channelId
    )

    return result
  }

  /**
   * Updates an existing temporary voice profile.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param data The data to update.
   * @param [data.name] The new name for the channel.
   * @param [data.limit] The new user limit for the channel.
   * @param [data.locked] Whether the channel should be locked.
   * @returns The updated profile.
   */
  public static async updateProfile(
    guildId: string,
    ownerId: string,
    data: { name?: string; limit?: number; locked?: boolean }
  ) {
    const result = await container.prisma.tempVoiceProfile.update({
      where: {
        guildId_ownerId: { guildId, ownerId }
      },
      data
    })

    await TempVoiceCacheService.invalidateProfileFull(
      guildId,
      ownerId,
      result.channelId
    )

    return result
  }

  /**
   * Sets the active channel ID for a profile.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param channelId The ID of the newly created channel.
   * @returns The updated profile.
   */
  public static async setActiveChannel(
    guildId: string,
    ownerId: string,
    channelId: string
  ) {
    const result = await container.prisma.tempVoiceProfile.update({
      where: {
        guildId_ownerId: { guildId, ownerId }
      },
      data: { channelId }
    })

    await TempVoiceCacheService.invalidateProfileFull(
      guildId,
      ownerId,
      channelId
    )

    return result
  }

  /**
   * Clears the active channel ID for a profile using the channel ID.
   * @param channelId The ID of the voice channel that was deleted.
   * @returns The updated profile.
   */
  public static async clearActiveChannelById(channelId: string) {
    const result = await container.prisma.tempVoiceProfile.update({
      where: { channelId },
      data: { channelId: null }
    })

    await TempVoiceCacheService.invalidateProfileFull(
      result.guildId,
      result.ownerId,
      channelId
    )

    return result
  }
}
