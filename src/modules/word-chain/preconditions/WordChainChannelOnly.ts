import { Precondition } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'

export class WordChainChannelOnlyPrecondition extends Precondition {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild)
      return this.error({
        message: 'Lệnh này chỉ có thể sử dụng trong máy chủ.'
      })

    const guildId = interaction.guild.id
    const setting = await SettingRepository.find(guildId)

    if (
      !setting?.vietnameseWordChainChannelId &&
      !setting?.englishWordChainChannelId
    ) {
      return this.error({
        message: 'Kênh nối từ chưa được thiết lập.'
      })
    }

    const isViChannel =
      interaction.channelId === setting.vietnameseWordChainChannelId
    const isEnChannel =
      interaction.channelId === setting.englishWordChainChannelId

    if (isViChannel || isEnChannel) {
      return this.ok()
    }

    const channels: string[] = []
    if (setting.vietnameseWordChainChannelId)
      channels.push(`<#${setting.vietnameseWordChainChannelId}>`)
    if (setting.englishWordChainChannelId)
      channels.push(`<#${setting.englishWordChainChannelId}>`)

    return this.error({
      message: `Lệnh này chỉ được sử dụng trong kênh ${channels.join(' hoặc ')}.`
    })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    WordChainChannelOnly: never
  }
}
