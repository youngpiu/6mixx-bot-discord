import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'

/**
 * Service for ensuring a temporary voice profile exists for a user.
 */
export class TempVoiceProfileEnsureService {
  /**
   * Ensures a profile exists for the given owner in the guild.
   * Creates a new profile with the fallback name if one doesn't exist.
   * @param guildId The ID of the guild.
   * @param ownerId The ID of the channel owner.
   * @param fallbackName The name to use if a new profile is created.
   * @returns The existing or newly created profile.
   */
  public static async ensure(
    guildId: string,
    ownerId: string,
    fallbackName: string
  ) {
    const profile = await TempVoiceProfileRepository.findByOwnerId(
      guildId,
      ownerId
    )
    if (profile) return profile
    return TempVoiceProfileRepository.upsertProfile({
      guildId,
      ownerId,
      name: fallbackName
    })
  }
}
