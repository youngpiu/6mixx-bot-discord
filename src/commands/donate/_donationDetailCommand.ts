import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { DonationStatus } from 'generated/prisma/enums'

import { EMOJI } from '~/constants/iconConstant'
import { BadRequestError, GuildOnlyError, NotFoundError } from '~/core/errorResponse'

import { DonationHelper } from '~/helpers/DonationHelper'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

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
      throw new GuildOnlyError()
    }

    const code = interaction.options.getString('code', true)

    if (!code) {
      throw new BadRequestError({
        description: 'Vui lòng lựa chọn một mã quyên góp mà bạn muốn xem chi tiết.'
      })
    }

    const donation = await DonateRepository.findByCode(code)

    if (!donation) {
      throw new NotFoundError({
        description: `Hệ thống không tìm thấy mã quyên góp này trong cơ sở dữ liệu.`
      })
    }

    const statusEmoji = DonationHelper.getStatusEmoji(donation.status)

    const embed = new EmbedBuilder()
      .setColor(donation.status === DonationStatus.TRANSFERRED ? 'Green' : 'Yellow')
      .setTitle(`Thông tin quyên góp #${donation.code}`)
      .addFields(
        {
          name: 'Mã giao dịch',
          value: `${statusEmoji} **#${donation.code}**`,
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
    if (
      donation.status === DonationStatus.PENDING ||
      donation.status === DonationStatus.PENDING_VERIFICATION
    ) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn-donation-change-status:TRANSFERRED:${donation.id}`)
          .setLabel('Xác nhận')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`btn-donation-change-status:CANCELED:${donation.id}`)
          .setLabel('Hủy')
          .setStyle(ButtonStyle.Danger)
      )
      components.push(row)
    }
    // For transferred donations, show Cancel button
    else if (donation.status === DonationStatus.TRANSFERRED) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn-donation-change-status:CANCELED:${donation.id}`)
          .setLabel('Hủy')
          .setStyle(ButtonStyle.Danger)
      )
      components.push(row)
    }
    // For canceled donations, show Confirm button to revert
    else if (donation.status === DonationStatus.CANCELED) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn-donation-change-status:TRANSFERRED:${donation.id}`)
          .setLabel('Xác nhận')
          .setStyle(ButtonStyle.Success)
      )
      components.push(row)
    }

    await interaction.editReply({ embeds: [embed], components })

    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.MEDIUM)
  }
}
