import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { DonationStatus } from 'generated/prisma/enums'

import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError, NotFoundError } from '~/core/errorResponse'

import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { DonateRepository } from '~/repositories/donateRepository'

export class DonationDetailCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
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

    const embed = new EmbedBuilder()
      .setColor(donation.status === DonationStatus.CONFIRMED ? 'Green' : 'Yellow')
      .setTitle(`Thông tin giao dịch quyên góp #${donation.code}`)
      .addFields(
        { name: 'Mã giao dịch', value: `*#${donation.code}*`, inline: false },
        { name: 'Mã người chuyển', value: `*#${donation.donor?.donorCode}*`, inline: true },
        { name: 'Số tiền', value: `${donation.amount.toLocaleString('vi-VN')}đ`, inline: true },
        {
          name: 'Trạng thái',
          value: donation.status === DonationStatus.CONFIRMED ? 'Đã xác nhận' : 'Chờ xác nhận',
          inline: false
        },
        {
          name: 'Thời gian tạo',
          value: `<t:${Math.floor(donation.createdAt.getTime() / 1000)}:R>`,
          inline: false
        }
      )

    if (donation.message) {
      embed.addFields({ name: 'Lời nhắn', value: donation.message })
    }

    if (donation.confirmedAt && donation.confirmedBy) {
      embed.addFields(
        {
          name: 'Người xác nhận',
          value: `<@${donation.confirmedBy}>`,
          inline: true
        },
        {
          name: 'Thời gian xác nhận',
          value: `<t:${Math.floor(donation.confirmedAt.getTime() / 1000)}:R>`,
          inline: true
        }
      )
    }

    const components = []

    if (donation.status === DonationStatus.PENDING) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn-donation-confirm:${donation.code}`)
          .setLabel('Xác nhận')
          .setStyle(ButtonStyle.Success)
      )
      components.push(row)
    }

    await interaction.editReply({ embeds: [embed], components })

    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.MEDIUM)
  }
}
