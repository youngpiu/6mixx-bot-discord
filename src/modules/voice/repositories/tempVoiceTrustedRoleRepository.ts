import { container } from '@sapphire/pieces'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'
import { TempVoiceCacheService } from '~/modules/voice/services/tempVoiceCacheService'

/**
 * Repository for managing trusted roles for temporary voice channels.
 * Members with these roles are allowed to join locked voice channels.
 */
export class TempVoiceTrustedRoleRepository {
  /**
   * Adds a role to the trusted roles list of a temporary voice profile.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param roleId The ID of the role to trust.
   * @returns The created/updated record or null if profile not found.
   */
  public static async add(guildId: string, ownerId: string, roleId: string) {
    const profile = await TempVoiceProfileRepository.findByOwnerId(
      guildId,
      ownerId
    )
    if (!profile) return null

    const result = await container.prisma.tempVoiceTrustedRole.upsert({
      where: {
        profileId_roleId: { profileId: profile.id, roleId }
      },
      create: { guildId, profileId: profile.id, roleId },
      update: {}
    })

    await TempVoiceCacheService.invalidateTrustedRoles(guildId, ownerId)

    return result
  }

  /**
   * Removes a role from the trusted roles list of a temporary voice profile.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param roleId The ID of the role to remove.
   * @returns The deleted record or null if not found.
   */
  public static async remove(guildId: string, ownerId: string, roleId: string) {
    const profile = await TempVoiceProfileRepository.findByOwnerId(
      guildId,
      ownerId
    )
    if (!profile) return null

    const result = await container.prisma.tempVoiceTrustedRole
      .delete({
        where: {
          profileId_roleId: { profileId: profile.id, roleId }
        }
      })
      .catch(() => null)

    await TempVoiceCacheService.invalidateTrustedRoles(guildId, ownerId)

    return result
  }

  /**
   * Lists all trusted roles for a given channel owner.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @returns A list of trusted roles.
   */
  public static async listByOwner(guildId: string, ownerId: string) {
    return TempVoiceCacheService.rememberTrustedRoles(
      guildId,
      ownerId,
      async () => {
        const profile = await TempVoiceProfileRepository.findByOwnerId(
          guildId,
          ownerId
        )
        if (!profile) return []

        return container.prisma.tempVoiceTrustedRole.findMany({
          where: { profileId: profile.id }
        })
      }
    )
  }

  /**
   * Deletes all trusted roles associated with a channel owner's profile.
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

    const result = await container.prisma.tempVoiceTrustedRole.deleteMany({
      where: { profileId: profile.id }
    })

    await TempVoiceCacheService.invalidateTrustedRoles(guildId, ownerId)

    return result
  }
}
