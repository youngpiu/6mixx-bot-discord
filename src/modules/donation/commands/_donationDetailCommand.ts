// Command to view and manage specific donation details
import {
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type InteractionEditReplyOptions,
  MessageFlags
} from 'discord.js'

import { DonationStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

import { DetailBuilder } from '~/shared/components/DetailBuilder'
import { CUSTOM_ID } from '~/shared/constants/idConstant'

import { DonationHelper } from '~/modules/donation/helpers/DonationHelper'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'

export class DonationDetailCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction.guild) return

    const code = interaction.options.getString('code', true)

    if (!code) {
      throw new NormalError(
        'Vui lòng lựa chọn một khoản quyên góp mà bạn muốn xem thông tin chi tiết.'
      )
    }

    const donation = await DonateRepository.findByCode(code)

    if (!donation) {
      throw new NormalError(`Không tìm thấy khoản quyên góp này.`)
    }

    const statusText = DonationHelper.getStatusText(donation.status)

    const fields: [string, string][] = [
      ['Trạng thái', `**${statusText}**`],
      ['Số tiền', `**${donation.amount.toLocaleString('vi-VN')}đ**`]
    ]

    if (donation.message) {
      fields.push(['Lời nhắn', `**${donation.message}**`])
    }

    fields.push([
      'Thời gian tạo',
      `<t:${Math.floor(donation.createdAt.getTime() / 1000)}:R>`
    ])

    const builder = new DetailBuilder({
      title: `Thông tin khoản quyên góp \`#${donation.code}\``
    }).addFields(fields)

    const actionRows: ButtonBuilder[][] = []

    const btnConfirm = new ButtonBuilder()
      .setCustomId(
        `${CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX}TRANSFERRED:${donation.id}`
      )
      .setLabel('Xác nhận')
      .setStyle(ButtonStyle.Success)

    const btnCancel = new ButtonBuilder()
      .setCustomId(
        `${CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX}CANCELED:${donation.id}`
      )
      .setLabel('Hủy')
      .setStyle(ButtonStyle.Danger)

    if (
      donation.status === DonationStatus.PENDING ||
      donation.status === DonationStatus.PENDING_VERIFICATION
    ) {
      actionRows.push([btnConfirm, btnCancel])
    } else if (donation.status === DonationStatus.TRANSFERRED) {
      actionRows.push([btnCancel])
    } else if (donation.status === DonationStatus.CANCELED) {
      actionRows.push([btnConfirm])
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
