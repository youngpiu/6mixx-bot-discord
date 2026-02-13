import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, EmbedBuilder } from 'discord.js'

import { ANIMATED_EMOJI } from '~/constants/iconConstant'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { lines } from '~/utils/textUtil'

import { DisbursementRepository } from '~/repositories/disbursementRepository'
import { DonateRepository } from '~/repositories/donateRepository'

export class ButtonDonationStatsHandler extends InteractionHandler {
  /**
   * Handles the display of donation and disbursement statistics.
   */
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-donation-stats') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler(async (interaction) => {
    if (!interaction.guildId) return

    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const [donationStats, disbursementStats, topDonors] = await Promise.all([
      DonateRepository.getStats(interaction.guildId),
      DisbursementRepository.getStats(interaction.guildId),
      DonateRepository.getTopDonors(interaction.guildId, 10)
    ])

    const remainingBalance = donationStats.totalAmount - disbursementStats.totalAmount

    const topDonorsList =
      topDonors.length > 0
        ? topDonors
            .map((d) => {
              const id = d.donorId
              const maskedId = `xxxxx${id.slice(5, -5)}xxxxx`
              return `  - **${maskedId}**: ${d.totalAmount.toLocaleString('vi-VN')}đ`
            })
            .join('\n')
        : '_Chưa có dữ liệu_'

    const embed = new EmbedBuilder()
      .setTitle(`${ANIMATED_EMOJI.WING_LEFT} GÓP GẠCH NUÔI BOT ${ANIMATED_EMOJI.WING_RIGHT}`)
      .setDescription(
        lines(
          `- **Quyên góp:**`,
          `  - **Số giao dịch:** ${donationStats.totalTransactions}`,
          `  - **Số người:** ${donationStats.uniqueDonors}`,
          `  - **Tổng tiền:** ${donationStats.totalAmount.toLocaleString('vi-VN')}đ`,
          `- **Giải ngân:**`,
          `  - **Số khoản chi:** ${disbursementStats.count}`,
          `  - **Tổng tiền:** ${disbursementStats.totalAmount.toLocaleString('vi-VN')}đ`,
          `  - **Số dư hiện tại:** ${remainingBalance.toLocaleString('vi-VN')}đ`,
          topDonors.length > 0 ? `- **Danh sách người quyên góp:**` : undefined,
          topDonors.length > 0 ? topDonorsList : undefined
        )
      )
      .setFooter({
        text: `Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN')} ngày ${new Date().toLocaleDateString('vi-VN').replace(/\//g, '.')}`,
        iconURL: interaction.guild?.iconURL() ?? undefined
      })

    await interaction.editReply({
      embeds: [embed]
    })
  })
}
