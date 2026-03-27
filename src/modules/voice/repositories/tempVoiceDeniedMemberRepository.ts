import { container } from '@sapphire/pieces'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'

/**
 * Repository for managing denied members for temporary voice channels.
 * Denied members are NOT allowed to join the voice channels, overriding any role permissions.
 */
export class TempVoiceDeniedMemberRepository {
  /**
   * Adds a user to the denied members list of a temporary voice profile.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param userId The ID of the user to deny.
   * @returns The created/updated record or null if profile not found.
   */
  public static async add(guildId: string, ownerId: string, userId: string) {
    const profile = await TempVoiceProfileRepository.findByOwnerId(
      guildId,
      ownerId
    )
    if (!profile) return null

    const result = await container.prisma.tempVoiceDeniedMember.upsert({
      where: {
        profileId_userId: { profileId: profile.id, userId }
      },
      create: { guildId, profileId: profile.id, userId },
      update: {}
    })

    // (Assuming no caching needed for denied members initially, or you can add one later if performance dictates)
    return result
  }

  /**
   * Removes a user from the denied members list of a temporary voice profile.
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

    const result = await container.prisma.tempVoiceDeniedMember
      .delete({
        where: {
          profileId_userId: { profileId: profile.id, userId }
        }
      })
      .catch(() => null)

    return result
  }

  /**
   * Lists all denied members for a given channel owner.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @returns A list of denied members.
   */
  public static async listByOwner(guildId: string, ownerId: string) {
    const profile = await TempVoiceProfileRepository.findByOwnerId(
      guildId,
      ownerId
    )
    if (!profile) return []

    return container.prisma.tempVoiceDeniedMember.findMany({
      where: { profileId: profile.id }
    })
  }

  /**
   * Deletes all denied members associated with a channel owner's profile.
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

    const result = await container.prisma.tempVoiceDeniedMember.deleteMany({
      where: { profileId: profile.id }
    })

    return result
  }
}
