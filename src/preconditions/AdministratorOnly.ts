import { Precondition } from '@sapphire/framework'
import {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  GuildMember,
  Message
} from 'discord.js'
import { ERROR_MESSAGE } from '~/constants/messageConstant'

export class AdministratorOnlyPrecondition extends Precondition {
  public override async messageRun(message: Message) {
    return this.checkAdministratorByMessage(message)
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    return this.checkAdministratorByInteraction(interaction)
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.checkAdministratorByInteraction(interaction)
  }

  private async checkAdministratorByMessage(message: Message) {
    const member = message.member
    if (!member) {
      return this.error({
        context: {
          title: ERROR_MESSAGE.FORBIDDEN.TITLE,
          description: ERROR_MESSAGE.FORBIDDEN.ADMIN_ONLY_DESCRIPTION
        }
      })
    }

    return member.permissions.has('Administrator')
      ? this.ok()
      : this.error({
          context: {
            title: ERROR_MESSAGE.FORBIDDEN.TITLE,
            description: ERROR_MESSAGE.FORBIDDEN.ADMIN_ONLY_DESCRIPTION
          }
        })
  }

  private async checkAdministratorByInteraction(
    interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction
  ) {
    const member = interaction.member as GuildMember
    return member.permissions.has('Administrator')
      ? this.ok()
      : this.error({
          context: {
            title: ERROR_MESSAGE.FORBIDDEN.TITLE,
            description: ERROR_MESSAGE.FORBIDDEN.ADMIN_ONLY_DESCRIPTION
          }
        })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    AdministratorOnly: never
  }
}
