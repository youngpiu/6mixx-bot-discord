import {
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type InteractionEditReplyOptions,
  MessageFlags
} from 'discord.js'
import { DonationHelper } from '~/modules/donation/helpers/DonationHelper'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'
import { DetailBuilder } from '~/shared/components/DetailBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'

import { NormalError } from '~/core/errorResponse'

export class DonationDetailCommand {
  /**
   * Main entry point for the donation detail command.
   * Fetches and displays detailed information about a specific donation.
   *
   * @param interaction - The chat input command interaction
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction || !interaction.guild) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const code = interaction.options.getString('code', true)

    if (!code) {
      throw new NormalError(
        'Vui lòng lựa chọn một mã quyên góp mà bạn muốn xem chi tiết.'
      )
    }

    const donation = await DonateRepository.findByCode(code)

    if (!donation) {
      throw new NormalError(
        `Hệ thống không tìm thấy mã quyên góp này trong cơ sở dữ liệu.`
      )
    }

    const statusText = DonationHelper.getStatusText(donation.status)

    const builder = new DetailBuilder({
      title: `Thông tin quyên góp #${donation.code}`
    }).addFields([
      ['Trạng thái', `**${statusText}**`],
      ['Mã giao dịch', `**#${donation.code}**`],
      ['Số tiền', `**${donation.amount.toLocaleString('vi-VN')}đ**`],
      [
        'Thời gian tạo',
        `<t:${Math.floor(donation.createdAt.getTime() / 1000)}:F>`
      ]
    ])

    if (donation.message) {
      builder.addFields([['Lời nhắn', `**${donation.message}**`]])
    }

    const actionRows: ButtonBuilder[][] = []

    // Check donation status to determine available actions
    if (
      donation.status === 'PENDING' ||
      donation.status === 'PENDING_VERIFICATION'
    ) {
      actionRows.push([
        new ButtonBuilder()
          .setCustomId(
            `${CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX}TRANSFERRED:${donation.id}`
          )
          .setLabel('Xác nhận')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(
            `${CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX}CANCELED:${donation.id}`
          )
          .setLabel('Hủy')
          .setStyle(ButtonStyle.Danger)
      ])
    }
    // For transferred donations, show Cancel button
    else if (donation.status === 'TRANSFERRED') {
      actionRows.push([
        new ButtonBuilder()
          .setCustomId(
            `${CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX}CANCELED:${donation.id}`
          )
          .setLabel('Hủy')
          .setStyle(ButtonStyle.Danger)
      ])
    }
    // For canceled donations, show Confirm button to revert
    else if (donation.status === 'CANCELED') {
      actionRows.push([
        new ButtonBuilder()
          .setCustomId(
            `${CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX}TRANSFERRED:${donation.id}`
          )
          .setLabel('Xác nhận')
          .setStyle(ButtonStyle.Success)
      ])
    }

    actionRows.forEach((rowButtons) => {
      builder.addActionRow(rowButtons)
    })

    const response: InteractionEditReplyOptions = {
      components: builder.build(),
      flags: [MessageFlags.IsComponentsV2]
    }

    await interaction.editReply(response)
  }
}
