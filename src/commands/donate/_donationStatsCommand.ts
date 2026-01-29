import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { Donation, Member } from 'generated/prisma/client'
import { DonationStatus } from 'generated/prisma/enums'

import { DEFAULT_PAGINATION_LIMIT } from '~/constants/commonConstant'
import { EMOIJ } from '~/constants/emoijConstant'
import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'

import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { DonateRepository } from '~/repositories/donateRepository'

type DonationWithDonor = Donation & { donor: Member }

export class DonationStatsCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const response = await this.createStatsResponse(interaction.guildId)
    await interaction.editReply(response)
    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.MEDIUM)
  }

  // Handle button: show stats view
  public static async handleShowStats(interaction: ButtonInteraction) {
    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const response = await this.createStatsResponse(interaction.guildId)
    await interaction.update(response)
  }

  // Handle button: show confirmed donations list
  public static async handleShowList(interaction: ButtonInteraction, page: number) {
    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const { items, meta } = await DonateRepository.getDonations({
      guildId: interaction.guildId,
      page,
      limit: DEFAULT_PAGINATION_LIMIT,
      status: DonationStatus.CONFIRMED
    })

    await interaction.update(this.createListResponse(items, meta))
  }

  // Create stats embed with button
  private static async createStatsResponse(guildId: string) {
    const stats = await DonateRepository.getStats(guildId)

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Thống kê quyên góp')
      .addFields(
        {
          name: 'Tổng tiền nhận được',
          value: `**${stats.totalAmount.toLocaleString('vi-VN')}đ**`,
          inline: false
        },
        {
          name: 'Số người quyên góp',
          value: `**${stats.uniqueDonors}** người`,
          inline: false
        },
        {
          name: 'Tổng giao dịch',
          value: `**${stats.totalTransactions}** giao dịch`,
          inline: false
        }
      )

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('btn-stats-list:1')
        .setLabel('Xem khoản thu')
        .setStyle(ButtonStyle.Primary)
    )

    return { embeds: [embed], components: [row] }
  }

  // Create list response with pagination and back button
  private static createListResponse(
    donations: Donation[],
    meta: {
      page: number
      total: number
      totalPages: number
      limit: number
      hasNext: boolean
      hasPrev: boolean
    }
  ) {
    const embed = new EmbedBuilder().setTitle('Danh sách khoản thu').setColor(0x5865f2)

    if (donations.length === 0) {
      embed.setDescription('Không có khoản quyên góp nào.')
    } else {
      donations.forEach((donation, index) => {
        const createdTimestamp = Math.floor(donation.createdAt.getTime() / 1000)
        const indexNumber = (meta.page - 1) * meta.limit + index + 1

        embed.addFields({
          name: `${indexNumber}. #${donation.code} ${EMOIJ.OK}`,
          value: [
            `**Mã người chuyển:** \`${(donation as DonationWithDonor).donor?.donorCode || 'N/A'}\``,
            `**Số tiền:** ${donation.amount.toLocaleString('vi-VN')}đ`,
            `**Thời gian tạo:** <t:${createdTimestamp}:R>`
          ].join('\n'),
          inline: false
        })
      })
    }

    embed.setFooter({
      text: `Trang ${meta.page}/${meta.totalPages || 1} • Tổng: ${meta.total} khoản`
    })

    // Navigation row
    const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn-stats-list:first:1`)
        .setLabel('⏮️ Đầu')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasPrev),
      new ButtonBuilder()
        .setCustomId(`btn-stats-list:prev:${meta.page - 1}`)
        .setLabel('◀️ Trước')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasPrev),
      new ButtonBuilder()
        .setCustomId(`btn-stats-list:next:${meta.page + 1}`)
        .setLabel('Sau ▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasNext),
      new ButtonBuilder()
        .setCustomId(`btn-stats-list:last:${meta.totalPages}`)
        .setLabel('Cuối ⏭️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasNext)
    )

    // Back button row
    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('btn-stats-back')
        .setLabel('← Quay lại thống kê')
        .setStyle(ButtonStyle.Secondary)
    )

    return { embeds: [embed], components: [navRow, backRow] }
  }
}
