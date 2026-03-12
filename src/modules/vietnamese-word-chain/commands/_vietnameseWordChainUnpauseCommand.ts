import { ChatInputCommandInteraction } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { VietnameseWordChainRedisService } from '~/modules/vietnamese-word-chain/services/VietnameseWordChainRedisService'

export class VietnameseWordChainUnpauseCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const guildId = interaction.guild.id
    const success = await VietnameseWordChainRedisService.setStatus(guildId, 'running')

    if (!success) {
      return InteractionUtil.replyError(interaction, 'Không có ván nối từ nào đang tạm dừng.')
    }

    await InteractionUtil.replySuccess(interaction, 'Ván nối từ đã tiếp tục.')
  }
}
