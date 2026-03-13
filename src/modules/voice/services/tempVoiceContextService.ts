import {
  ChatInputCommandInteraction,
  GuildMember,
  VoiceChannel
} from 'discord.js'

import { TempVoiceProfile } from 'generated/prisma/client'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'

/**
 * Service for retrieving the context of a temporary voice channel from an interaction.
 */
export class TempVoiceContextService {
  /**
   * Retrieves the voice channel and associated profile from the interaction.
   * @param interaction The command interaction.
   * @throws {NormalError} If the user is not in a temporary voice channel or profile is not found.
   * @returns The voice channel and profile.
   */
  public static async get(interaction: ChatInputCommandInteraction): Promise<{
    channel: VoiceChannel
    profile: TempVoiceProfile
  }> {
    const member = interaction.member as GuildMember
    const channel = member.voice!.channel as VoiceChannel

    const profile = (await TempVoiceProfileRepository.findByChannelId(
      channel.id
    ))!

    return { channel, profile }
  }
}
