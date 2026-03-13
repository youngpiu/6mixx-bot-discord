import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import {
  type WordChainMode,
  WordChainRedisService
} from '~/modules/word-chain/services/WordChainRedisService'

export class WordChainPauseCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const guildId = interaction.guild!.id
    const mode = await this.detectMode(guildId, interaction.channelId)
    if (!mode) {
      throw new NormalError('Kênh này không phải kênh nối từ.')
    }

    const success = await WordChainRedisService.setStatus(
      guildId,
      mode,
      'paused'
    )

    if (!success) {
      throw new NormalError('Không có ván nối từ nào đang chạy.')
    }

    await InteractionUtil.replySuccess(interaction, 'Ván nối từ đã tạm dừng.')
  }

  private static async detectMode(
    guildId: string,
    channelId: string
  ): Promise<WordChainMode | null> {
    const setting = await SettingRepository.find(guildId)
    if (!setting) return null
    if (channelId === setting.vietnameseWordChainChannelId) return 'vi'
    if (channelId === setting.englishWordChainChannelId) return 'en'
    return null
  }
}
