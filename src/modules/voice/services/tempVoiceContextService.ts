import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  ModalSubmitInteraction,
  VoiceChannel
} from 'discord.js'

import { TempVoiceProfile } from 'generated/prisma/client'

import { NormalError } from '~/core/errorResponse'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'

/**
 * Service for retrieving the context of a temporary voice channel from an interaction.
 */
export class TempVoiceContextService {
  /**
   * Retrieves the voice channel and associated profile from the interaction.
   * @param interaction The command or modal submit interaction.
   * @throws {NormalError} If the user is not in a temporary voice channel or profile is not found.
   * @returns The voice channel and profile.
   */
  public static async get(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction
  ): Promise<{
    channel: VoiceChannel
    profile: TempVoiceProfile
  }> {
    const member = interaction.member as GuildMember
    const voiceChannel = member.voice?.channel

    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
      throw new NormalError(
        'Bạn phải ở trong phòng thoại tạm thời để dùng lệnh này.'
      )
    }

    const profile = await TempVoiceProfileRepository.findByChannelId(
      voiceChannel.id
    )

    if (!profile) {
      throw new NormalError('Không tìm thấy thông tin phòng thoại tạm thời.')
    }

    return { channel: voiceChannel as VoiceChannel, profile }
  }
}
