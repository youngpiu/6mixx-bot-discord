// Precondition that restricts command execution to the guild owner
import { Identifiers, Precondition } from '@sapphire/framework'
import type {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Message
} from 'discord.js'

export class OwnerOnlyPrecondition extends Precondition {
  public override messageRun(message: Message) {
    return message.guild?.ownerId === message.author.id
      ? this.ok()
      : this.makeSharedError()
  }

  public override chatInputRun(interaction: ChatInputCommandInteraction) {
    return interaction.guild?.ownerId === interaction.user.id
      ? this.ok()
      : this.makeSharedError()
  }

  public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return interaction.guild?.ownerId === interaction.user.id
      ? this.ok()
      : this.makeSharedError()
  }

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
