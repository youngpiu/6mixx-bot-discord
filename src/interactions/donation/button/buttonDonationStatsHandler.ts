import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, ContainerBuilder } from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'

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
    if (interaction.customId !== CUSTOM_ID.BTN_DONATION_STATS) return this.none()
    return this.some()
  }

  public async run(interaction: ButtonInteraction) {
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

    const statsContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent(lines('## THỐNG KÊ GÓP GẠCH NUÔI BOT')))
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
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
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          `-# Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN')} ngày ${new Date().toLocaleDateString('vi-VN').replace(/\//g, '.')}`
        )
      )

    await interaction.editReply({
      components: [statsContainer],
      flags: ['IsComponentsV2']
    })
  }
}
