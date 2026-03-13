import { container } from '@sapphire/pieces'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'
import { TempVoiceCacheService } from '~/modules/voice/services/tempVoiceCacheService'

/**
 * Repository for managing trusted members for temporary voice channels.
 * Trusted members are allowed to join locked voice channels.
 */
export class TempVoiceTrustedMemberRepository {
  /**
   * Adds a user to the trusted members list of a temporary voice profile.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param userId The ID of the user to trust.
   * @returns The created/updated record or null if profile not found.
   */
  public static async add(guildId: string, ownerId: string, userId: string) {
    const profile = await TempVoiceProfileRepository.findByOwnerId(
      guildId,
      ownerId
    )
    if (!profile) return null

    const result = await container.prisma.tempVoiceTrustedMember.upsert({
      where: {
        profileId_userId: { profileId: profile.id, userId }
      },
      create: { guildId, profileId: profile.id, userId },
      update: {}
    })

    await TempVoiceCacheService.invalidateTrustedMembers(guildId, ownerId)

    return result
  }

  /**
   * Removes a user from the trusted members list of a temporary voice profile.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param userId The ID of the user to remove.
   * @returns The deleted record or null if not found.
   */
  public static async remove(guildId: string, ownerId: string, userId: string) {
    const profile = await TempVoiceProfileRepository.findByOwnerId(
      guildId,
      ownerId
    )
    if (!profile) return null

    const result = await container.prisma.tempVoiceTrustedMember
      .delete({
        where: {
          profileId_userId: { profileId: profile.id, userId }
        }
      })
      .catch(() => null)

    await TempVoiceCacheService.invalidateTrustedMembers(guildId, ownerId)

    return result
  }

  /**
   * Lists all trusted members for a given channel owner.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @returns A list of trusted members.
   */
  public static async listByOwner(guildId: string, ownerId: string) {
    return TempVoiceCacheService.rememberTrustedMembers(
      guildId,
      ownerId,
      async () => {
        const profile = await TempVoiceProfileRepository.findByOwnerId(
          guildId,
          ownerId
        )
        if (!profile) return []

        return container.prisma.tempVoiceTrustedMember.findMany({
          where: { profileId: profile.id }
        })
      }
    )
  }

  /**
   * Deletes all trusted members associated with a channel owner's profile.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @returns The number of deleted records.
   */
  public static async deleteByOwner(guildId: string, ownerId: string) {
    const profile = await TempVoiceProfileRepository.findByOwnerId(
      guildId,
      ownerId
    )
    if (!profile) return { count: 0 }

    const result = await container.prisma.tempVoiceTrustedMember.deleteMany({
      where: { profileId: profile.id }
    })

    await TempVoiceCacheService.invalidateTrustedMembers(guildId, ownerId)

    return result
  }
}
