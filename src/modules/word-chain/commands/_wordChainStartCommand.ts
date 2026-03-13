import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import {
  type WordChainMode,
  WordChainRedisService
} from '~/modules/word-chain/services/WordChainRedisService'
import { WordChainService } from '~/modules/word-chain/services/WordChainService'

export class WordChainStartCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const guildId = interaction.guild!.id

    // Detect mode from channel
    const setting = await SettingRepository.find(guildId)
    const mode = this.detectMode(interaction.channelId, setting)

    if (!mode) {
      throw new NormalError(
        'Chưa cấu hình kênh nối từ. Dùng `/setting` để thiết lập.'
      )
    }

    const channelId =
      mode === 'vi'
        ? setting!.vietnameseWordChainChannelId!
        : setting!.englishWordChainChannelId!

    // If active session exists, end it first (Smart Reset)
    const currentState = await WordChainRedisService.getState(guildId, mode)
    if (currentState) {
      const reason = 'Ván đấu được bắt đầu lại bởi Admin.'
      await WordChainService.endGame(
        interaction.guild!,
        channelId,
        mode,
        currentState.sessionId,
        currentState.playersScore,
        { isManualReset: true, reason }
      )
    } else {
      await WordChainRedisService.deleteState(guildId, mode)
    }

    // Start new game
    const success = await WordChainService.startNewGame(
      interaction.guild!,
      channelId,
      mode
    )

    if (!success) {
      throw new NormalError(
        'Không thể bắt đầu ván mới. Vui lòng kiểm tra lại từ điển.'
      )
    }

    await InteractionUtil.replySuccess(
      interaction,
      `Ván nối từ đã bắt đầu trong <#${channelId}>!`
    )
  }

  private static detectMode(
    channelId: string,
    setting: {
      vietnameseWordChainChannelId?: string | null
      englishWordChainChannelId?: string | null
    } | null
  ): WordChainMode | null {
    if (!setting) return null
    if (channelId === setting.vietnameseWordChainChannelId) return 'vi'
    if (channelId === setting.englishWordChainChannelId) return 'en'
    return null
  }
}
