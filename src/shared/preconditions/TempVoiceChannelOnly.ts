import { Identifiers, Precondition } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'

import { TempVoiceChannelRepository } from '~/modules/voice/repositories/tempVoiceChannelRepository'

/**
 * Precondition that ensures the user is currently in a recognized temporary voice channel.
 */
export class TempVoiceChannelOnlyPrecondition extends Precondition {
  /**
   * Runs the precondition for chat input (slash) commands.
   * Checks if the user is in a voice channel and if that channel exists in the database.
   *
   * @param interaction - The interaction that triggered the command.
   * @returns A Precondition.Result indicating if the user is in a temp voice channel.
   */
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const member = interaction.member
    if (!member || !('voice' in member) || !member.voice.channelId) {
      return this.makeSharedError(
        'Bạn phải ở trong phòng thoại tạm để dùng lệnh này.'
      )
    }

    const record = await TempVoiceChannelRepository.findByChannelId(
      member.voice.channelId
    )

    if (!record) {
      return this.makeSharedError(
        'Bạn phải ở trong phòng thoại tạm để dùng lệnh này.'
      )
    }

    return this.ok()
  }

  /**
   * Creates a standardized error result for this precondition.
   *
   * @param message - The error message to display.
   * @returns A Precondition.Error with a custom message.
   */
  private makeSharedError(message: string) {
    return this.error({
      message,
      identifier: Identifiers.PreconditionUserPermissions,
      context: {
        isCustomMessage: true
      }
    })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    TempVoiceChannelOnly: never
  }
}
