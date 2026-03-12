import { Identifiers, Precondition } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'

import { TempVoiceChannelRepository } from '~/modules/voice/repositories/tempVoiceChannelRepository'

/**
 * Precondition that ensures the user is the owner of the temporary voice channel they are currently in.
 */
export class TempVoiceOwnerOnlyPrecondition extends Precondition {
  /**
   * Runs the precondition for chat input (slash) commands.
   * Verifies that the user is in a voice channel and that they are the registered owner of that channel.
   *
   * @param interaction - The interaction that triggered the command.
   * @returns A Precondition.Result indicating if the user is the channel owner.
   */
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const member = interaction.member
    if (!member || !('voice' in member) || !member.voice.channelId) {
      return this.makeSharedError('Bạn không phải chủ phòng.')
    }

    const record = await TempVoiceChannelRepository.findByChannelId(
      member.voice.channelId
    )

    if (!record || record.ownerId !== interaction.user.id) {
      return this.makeSharedError('Bạn không phải chủ phòng.')
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
    TempVoiceOwnerOnly: never
  }
}
