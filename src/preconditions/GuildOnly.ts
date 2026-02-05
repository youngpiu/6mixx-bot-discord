import { Precondition } from '@sapphire/framework'
import { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js'

import { ERROR_MESSAGE } from '~/constants/messageConstant'

export class GuildOnlyPrecondition extends Precondition {
  public override async messageRun(message: Message) {
    return message.guild
      ? this.ok()
      : this.error({
          context: {
            title: ERROR_MESSAGE.BAD_REQUEST.TITLE,
            description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
          }
        })
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    return interaction.guild
      ? this.ok()
      : this.error({
          context: {
            title: ERROR_MESSAGE.BAD_REQUEST.TITLE,
            description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
          }
        })
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return interaction.guild
      ? this.ok()
      : this.error({
          context: {
            title: ERROR_MESSAGE.BAD_REQUEST.TITLE,
            description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
          }
        })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    GuildOnly: never
  }
}
