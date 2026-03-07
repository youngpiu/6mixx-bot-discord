import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js'

import { DonationStatus } from 'generated/prisma/enums'

import { CUSTOM_ID } from '~/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

import { DonationHelper } from '~/helpers/DonationHelper'

import { DonateRepository } from '~/repositories/donateRepository'

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

    if (!interaction.guildId) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const code = interaction.options.getString('code', true)

    if (!code) {
      throw new NormalError('Vui lòng lựa chọn một mã quyên góp mà bạn muốn xem chi tiết.')
    }

    const donation = await DonateRepository.findByCode(code)

    if (!donation) {
      throw new NormalError(`Hệ thống không tìm thấy mã quyên góp này trong cơ sở dữ liệu.`)
    }

    const statusText = DonationHelper.getStatusText(donation.status as unknown as DonationStatus)

    const embed = new EmbedBuilder()
      .setColor(donation.status === 'TRANSFERRED' ? 'Green' : 'Yellow')
      .setTitle(`Thông tin quyên góp #${donation.code}`)
      .addFields(
        {
          name: 'Trạng thái',
          value: `**${statusText}**`,
          inline: false
        },
        {
          name: 'Mã giao dịch',
          value: `**#${donation.code}**`,
          inline: false
        },
        { name: 'Số tiền', value: `${donation.amount.toLocaleString('vi-VN')}đ`, inline: false },
        {
          name: 'Thời gian tạo',
          value: `<t:${Math.floor(donation.createdAt.getTime() / 1000)}:R>`,
          inline: false
        }
      )

    if (donation.message) {
      embed.addFields({ name: 'Lời nhắn', value: donation.message })
    }

    const components = []

    // Check donation status to determine available actions
    if (donation.status === 'PENDING' || donation.status === 'PENDING_VERIFICATION') {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX}TRANSFERRED:${donation.id}`)
          .setLabel('Xác nhận')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX}CANCELED:${donation.id}`)
          .setLabel('Hủy')
          .setStyle(ButtonStyle.Danger)
      )
      components.push(row)
    }
    // For transferred donations, show Cancel button
    else if (donation.status === 'TRANSFERRED') {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX}CANCELED:${donation.id}`)
          .setLabel('Hủy')
          .setStyle(ButtonStyle.Danger)
      )
      components.push(row)
    }
    // For canceled donations, show Confirm button to revert
    else if (donation.status === 'CANCELED') {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX}TRANSFERRED:${donation.id}`)
          .setLabel('Xác nhận')
          .setStyle(ButtonStyle.Success)
      )
      components.push(row)
    }

    await interaction.editReply({ embeds: [embed], components })
  }
}
