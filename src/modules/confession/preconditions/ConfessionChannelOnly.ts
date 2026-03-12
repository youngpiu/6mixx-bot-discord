import { Precondition } from '@sapphire/framework'
import type {
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction
} from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'

export class ConfessionChannelOnlyPrecondition extends Precondition {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    return this.checkChannel(interaction)
  }

  public override async contextMenuRun(
    interaction: MessageContextMenuCommandInteraction
  ) {
    return this.checkChannel(interaction)
  }

  private async checkChannel(
    interaction:
      | ChatInputCommandInteraction
      | MessageContextMenuCommandInteraction
  ) {
    if (!interaction.guild) {
      return this.error({
        message: 'Lệnh này chỉ có thể sử dụng trong máy chủ.'
      })
    }

    const guildId = interaction.guild.id
    const setting = await SettingRepository.find(guildId)

    if (!setting?.confessionForumChannelId) {
      return this.error({
        message: 'Kênh Confession chưa được thiết lập.'
      })
    }

    const isConfessionChannel =
      interaction.channelId === setting.confessionForumChannelId ||
      (interaction.channel?.isThread() &&
        interaction.channel.parentId === setting.confessionForumChannelId)

    return isConfessionChannel
      ? this.ok()
      : this.error({
          message: `Lệnh này chỉ được sử dụng trong kênh <#${setting.confessionForumChannelId}>.`
        })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    ConfessionChannelOnly: never
  }
}
