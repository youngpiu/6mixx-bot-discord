import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'

import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { DonateRepository } from '~/repositories/donateRepository'

export class DonationStatsCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const stats = await DonateRepository.getStats(interaction.guildId)

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📊 Thống kê quyên góp')
      .addFields(
        {
          name: '💰 Tổng tiền nhận được',
          value: `**${stats.totalAmount.toLocaleString('vi-VN')}đ**`,
          inline: true
        },
        {
          name: '👥 Số người donate',
          value: `**${stats.uniqueDonors}** người`,
          inline: true
        },
        {
          name: '📝 Tổng giao dịch',
          value: `**${stats.totalTransactions}** giao dịch`,
          inline: true
        }
      )
      .setFooter({ text: 'Chỉ tính các khoản đã xác nhận' })
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })
    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.MEDIUM)
  }
}
