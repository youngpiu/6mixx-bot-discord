import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction, ContainerBuilder } from 'discord.js'
import { DisbursementRepository } from '~/modules/donation/repositories/disbursementRepository'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'
import { ANIMATED_EMOJI } from '~/shared/constants/emojiConstant'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { encryptId, formatFields, lines } from '~/shared/utils/textUtil'

export class ButtonDonationStats extends InteractionHandler {
  /**
   * Handles the display of donation and disbursement statistics.
   */
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_DONATION_STATS)
      return this.none()
    return this.some()
  }

  public async run(interaction: ButtonInteraction) {
    if (!interaction || !interaction.guild) return

    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const [donationStats, disbursementStats, topDonors] = await Promise.all([
      DonateRepository.getStats(interaction.guild.id),
      DisbursementRepository.getStats(interaction.guild.id),
      DonateRepository.getTopDonors(interaction.guild.id, 10)
    ])

    const remainingBalance =
      donationStats.totalAmount - disbursementStats.totalAmount

    const topDonorsFields = topDonors.map((d) => {
      const maskedId = encryptId(d.donorId)
      return [maskedId, `**${d.totalAmount.toLocaleString('vi-VN')}đ**`] as [
        string,
        string
      ]
    })

    const statsContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          `### ${ANIMATED_EMOJI.WING_LEFT} THỐNG KÊ GÓP GẠCH NUÔI BOT ${ANIMATED_EMOJI.WING_RIGHT}`
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `- **Quyên góp:**`,
            ...formatFields(
              [
                ['Số người', `**${donationStats.uniqueDonors}**`],
                ['Số giao dịch', `**${donationStats.totalTransactions}**`],
                [
                  'Tổng tiền',
                  `**${donationStats.totalAmount.toLocaleString('vi-VN')}đ**`
                ]
              ],
              '  - '
            ),
            `- **Giải ngân:**`,
            ...formatFields(
              [
                ['Số khoản chi', `**${disbursementStats.count}**`],
                [
                  'Tổng tiền',
                  `**${disbursementStats.totalAmount.toLocaleString('vi-VN')}đ**`
                ],
                [
                  'Số dư hiện tại',
                  `**${remainingBalance.toLocaleString('vi-VN')}đ**`
                ]
              ],
              '  - '
            ),
            topDonors.length > 0 ? `- **Danh sách quyên góp:**` : undefined,
            ...formatFields(topDonorsFields, '  - ')
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(`-# Cập nhật <t:${Math.floor(Date.now() / 1000)}:F>`)
      )

    await interaction.editReply({
      components: [statsContainer],
      flags: ['IsComponentsV2']
    })
  }
}
