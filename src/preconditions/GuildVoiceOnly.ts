import { Precondition } from '@sapphire/framework'
import {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  GuildMember,
  Message
} from 'discord.js'

import { ERROR_MESSAGE } from '~/constants/messageConstant'

export class GuildVoiceOnlyPrecondition extends Precondition {
  public override async messageRun(message: Message) {
    const member = message.member as GuildMember | null
    return member?.voice.channel
      ? this.ok()
      : this.error({
          context: {
            title: ERROR_MESSAGE.BAD_REQUEST.TITLE,
            description: 'Bạn cần tham gia kênh thoại để sử dụng lệnh này.'
          }
        })
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember | null
    return member?.voice.channel
      ? this.ok()
      : this.error({
          context: {
            title: ERROR_MESSAGE.BAD_REQUEST.TITLE,
            description: 'Bạn cần tham gia kênh thoại để sử dụng lệnh này.'
          }
        })
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    const member = interaction.member as GuildMember | null
    return member?.voice.channel
      ? this.ok()
      : this.error({
          context: {
            title: ERROR_MESSAGE.BAD_REQUEST.TITLE,
            description: 'Bạn cần tham gia kênh thoại để sử dụng lệnh này.'
          }
        })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    GuildVoiceOnly: never
  }
}
