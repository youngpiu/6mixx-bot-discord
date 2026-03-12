// Precondition that restricts command execution to the guild owner
import { Identifiers, Precondition } from '@sapphire/framework'
import type {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Message
} from 'discord.js'

/**
 * Precondition that restricts command execution to the guild owner only.
 */
export class OwnerOnlyPrecondition extends Precondition {
  /**
   * Runs the precondition for message-based commands.
   *
   * @param message - The message that triggered the command.
   * @returns A Precondition.Result indicating if the user is the guild owner.
   */
  public override messageRun(message: Message) {
    return message.guild?.ownerId === message.author.id
      ? this.ok()
      : this.makeSharedError()
  }

  /**
   * Runs the precondition for chat input (slash) commands.
   *
   * @param interaction - The interaction that triggered the command.
   * @returns A Precondition.Result indicating if the user is the guild owner.
   */
  public override chatInputRun(interaction: ChatInputCommandInteraction) {
    return interaction.guild?.ownerId === interaction.user.id
      ? this.ok()
      : this.makeSharedError()
  }

  /**
   * Runs the precondition for context menu commands.
   *
   * @param interaction - The interaction that triggered the command.
   * @returns A Precondition.Result indicating if the user is the guild owner.
   */
  public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return interaction.guild?.ownerId === interaction.user.id
      ? this.ok()
      : this.makeSharedError()
  }

  /**
   * Creates a standardized error result for this precondition.
   *
   * @returns A Precondition.Error with a custom Vietnamese message.
   */
  private makeSharedError() {
    return this.error({
      message: 'Lệnh này chỉ dành cho chủ sở hữu máy chủ.',
      identifier: Identifiers.PreconditionUserPermissions,
      context: {
        isCustomMessage: true
      }
    })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    OwnerOnly: never
  }
}
