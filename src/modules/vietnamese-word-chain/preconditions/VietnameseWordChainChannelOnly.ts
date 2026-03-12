import { Precondition } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'

export class VietnameseWordChainChannelOnlyPrecondition extends Precondition {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild)
      return this.error({
        message: 'Lệnh này chỉ có thể sử dụng trong máy chủ.'
      })

    const guildId = interaction.guild.id
    const setting = await SettingRepository.find(guildId)

    if (!setting?.wordChainChannelId) {
      return this.error({
        message: 'Kênh nối từ chưa được thiết lập.'
      })
    }

    return interaction.channelId === setting.wordChainChannelId
      ? this.ok()
      : this.error({
          message: `Lệnh này chỉ được sử dụng trong kênh <#${setting.wordChainChannelId}>.`
        })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    VietnameseWordChainChannelOnly: never
  }
}
