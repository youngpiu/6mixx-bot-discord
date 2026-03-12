import { ChatInputCommandInteraction } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { VietnameseWordChainRedisService } from '~/modules/vietnamese-word-chain/services/VietnameseWordChainRedisService'
import { VietnameseWordChainService } from '~/modules/vietnamese-word-chain/services/VietnameseWordChainService'

export class VietnameseWordChainStartCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const guildId = interaction.guild.id

    // 1. Check channel configured
    const setting = await SettingRepository.find(guildId)
    if (!setting?.wordChainChannelId) {
      return InteractionUtil.replyError(
        interaction,
        'Chưa cấu hình kênh nối từ. Dùng `/setting` để thiết lập.'
      )
    }

    // 2. If active session exists, end it first (Smart Reset)
    const currentState = await VietnameseWordChainRedisService.getState(guildId)
    if (currentState) {
      await VietnameseWordChainService.endGame(
        interaction.guild,
        setting.wordChainChannelId,
        currentState.sessionId,
        currentState.playersScore,
        { isManualReset: true, reason: 'Ván đấu được bắt đầu lại bởi Admin.' }
      )
    } else {
      // Just to be safe if there was any ghost state
      await VietnameseWordChainRedisService.deleteState(guildId)
    }

    // 3. Start new game via Service
    const success = await VietnameseWordChainService.startNewGame(interaction.guild, setting.wordChainChannelId)

    if (!success) {
      return InteractionUtil.replyError(
        interaction,
        'Không thể bắt đầu ván mới. Vui lòng kiểm tra lại từ điển.'
      )
    }

    await InteractionUtil.replySuccess(
      interaction,
      `Ván nối từ đã bắt đầu trong <#${setting.wordChainChannelId}>!`
    )
  }
}
