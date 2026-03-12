import { ApplyOptions, RequiresGuildContext } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction, ContainerBuilder } from 'discord.js'

import { ANIMATED_EMOJI } from '~/shared/constants/emojiConstant'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { encryptId, formatFields, lines } from '~/shared/utils/textUtil'

import { DisbursementRepository } from '~/modules/donation/repositories/disbursementRepository'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonDonationStats extends InteractionHandler {
  // Displays aggregate statistics for donations and disbursements
  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_DONATION_STATS)
      return this.none()
    return this.some()
  }

  @RequiresGuildContext()
  public async run(interaction: ButtonInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const [donationStats, disbursementStats, topDonors] = await Promise.all([
      DonateRepository.getStats(interaction.guild!.id),
      DisbursementRepository.getStats(interaction.guild!.id),
      DonateRepository.getTopDonors(interaction.guild!.id, 10)
    ])

    const remainingBalance =
      donationStats.totalAmount - disbursementStats.totalAmount

    const topDonorsFields = topDonors.map(
      (d: { donorId: string; totalAmount: number }) => {
        const maskedId = encryptId(d.donorId)
        return [maskedId, `**${d.totalAmount.toLocaleString('vi-VN')}đ**`] as [
          string,
          string
        ]
      }
    )

    const donationFields: [string, string][] = [
      ['Số người', `**${donationStats.uniqueDonors}**`],
      ['Số giao dịch', `**${donationStats.totalTransactions}**`],
      ['Tổng tiền', `**${donationStats.totalAmount.toLocaleString('vi-VN')}đ**`]
    ]

    const disbursementFields: [string, string][] = [
      ['Số khoản chi', `**${disbursementStats.count}**`],
      [
        'Tổng tiền',
        `**${disbursementStats.totalAmount.toLocaleString('vi-VN')}đ**`
      ],
      ['Số dư hiện tại', `**${remainingBalance.toLocaleString('vi-VN')}đ**`]
    ]

    // Use a single formatFields call for all fields to ensure global alignment (same maxKeyLength)
    // then slice it back to original sections.
    const allFormatted = formatFields(
      [...donationFields, ...disbursementFields, ...topDonorsFields],
      '  - '
    )

    const formattedDonation = allFormatted.slice(0, donationFields.length)
    const formattedDisbursement = allFormatted.slice(
      donationFields.length,
      donationFields.length + disbursementFields.length
    )
    const formattedTopDonors = allFormatted.slice(
      donationFields.length + disbursementFields.length
    )

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
            ...formattedDonation,
            `- **Giải ngân:**`,
            ...formattedDisbursement,
            topDonors.length > 0 ? `- **Danh sách quyên góp:**` : undefined,
            ...formattedTopDonors
          )
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(`-# Cập nhật <t:${Math.floor(Date.now() / 1000)}:R>`)
      )

    await interaction.editReply({
      components: [statsContainer],
      flags: ['IsComponentsV2']
    })
  }
}
