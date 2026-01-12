import { Precondition } from '@sapphire/framework'
import {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Message
} from 'discord.js'

export class OwnerOnlyPrecondition extends Precondition {
  public override async messageRun(message: Message) {
    return this.checkOwnerByMessage(message)
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    return this.checkOwnerByInteraction(interaction)
  }

  public override async contextMenuRun(
    interaction: ContextMenuCommandInteraction
  ) {
    return this.checkOwnerByInteraction(interaction)
  }

  private async checkOwnerByMessage(message: Message) {
    return message.guild?.ownerId === message.author.id
      ? this.ok()
      : this.error({
          message: 'Chỉ người sở hữu máy chủ mới có thể sử dụng lệnh này!'
        })
  }

  private async checkOwnerByInteraction(
    interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction
  ) {
    return interaction.guild?.ownerId === interaction.user.id
      ? this.ok()
      : this.error({
          message: 'Chỉ người sở hữu máy chủ mới có thể sử dụng lệnh này!'
        })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    OwnerOnly: never
  }
}
