import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js'

import { STATIC_EMOJI } from '~/constants/emojiConstant'
import { NormalError } from '~/core/errorResponse'

import { lines } from '~/utils/textUtil'

import { DisbursementRepository } from '~/repositories/disbursementRepository'

export interface DisbursementListMeta {
  page: number
  total: number
  totalPages: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export class DonationDisbursementListCommand {
  /**
   * Main entry point for the disbursement list command.
   *
   * @param interaction - The chat input command interaction
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await this.showList(interaction)
  }

  /**
   * Displays the list of disbursements.
   * Can be called from slash command or button interaction.
   *
   * @param interaction - ChatInputCommandInteraction or ButtonInteraction
   */
  public static async showList(interaction: ChatInputCommandInteraction | ButtonInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    if (!interaction.guildId) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const { items, meta } = await DisbursementRepository.getDisbursements({
      guildId: interaction.guildId,
      page: 1,
      limit: 10
    })

    const response = {
      total: meta.total,
      page: meta.page,
      totalPages: meta.totalPages,
      limit: meta.limit,
      hasNext: meta.page < meta.totalPages,
      hasPrev: meta.page > 1
    }

    await interaction.editReply(this.createListResponse(items, response))
  }

  /**
   * Handles button interactions for pagination.
   *
   * @param interaction - The button interaction
   * @param page - The page number to display
   */
  public static async handleButton(interaction: ButtonInteraction, page: number) {
    if (!interaction.guildId) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const { items, meta } = await DisbursementRepository.getDisbursements({
      guildId: interaction.guildId,
      page,
      limit: 10
    })

    const response = {
      total: meta.total,
      page: meta.page,
      totalPages: meta.totalPages,
      limit: meta.limit,
      hasNext: meta.page < meta.totalPages,
      hasPrev: meta.page > 1
    }

    await interaction.editReply(this.createListResponse(items, response))
  }

  public static createListResponse(
    items: Awaited<ReturnType<typeof DisbursementRepository.getDisbursements>>['items'],
    meta: DisbursementListMeta
  ) {
    return {
      embeds: [this.createEmbed(items, meta)],
      components: [this.createPagination(meta)]
    }
  }

  private static createEmbed(
    items: Awaited<ReturnType<typeof DisbursementRepository.getDisbursements>>['items'],
    meta: DisbursementListMeta
  ) {
    const embed = new EmbedBuilder().setTitle('Danh sách các khoản chi').setColor('Navy')

    if (items.length === 0) {
      embed.setDescription('Chưa có khoản chi nào.')
    } else {
      items.forEach((item, index) => {
        const indexNumber = (meta.page - 1) * meta.limit + index + 1
        const dateString = item.createdAt.toLocaleDateString('vi-VN').replace(/\//g, '.')

        embed.addFields({
          name: `**${indexNumber}. Ngày ${dateString}**`,
          value: lines(
            `- **Số tiền:** ${item.amount.toLocaleString('vi-VN')}đ`,
            `- **Mô tả:** ${item.description}`
          ),
          inline: false
        })
      })
    }

    embed.setFooter({
      text: `Trang ${meta.page}/${meta.totalPages || 1} • Tổng: ${meta.total} khoản`
    })

    return embed
  }

  private static createPagination(meta: DisbursementListMeta) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`disbursement-list:first:1`)
        .setEmoji(STATIC_EMOJI.FIRST)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasPrev),
      new ButtonBuilder()
        .setCustomId(`disbursement-list:prev:${meta.page - 1}`)
        .setEmoji(STATIC_EMOJI.PREVIOUS)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasPrev),
      new ButtonBuilder()
        .setCustomId(`disbursement-list:next:${meta.page + 1}`)
        .setEmoji(STATIC_EMOJI.NEXT)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasNext),
      new ButtonBuilder()
        .setCustomId(`disbursement-list:last:${meta.totalPages}`)
        .setEmoji(STATIC_EMOJI.LAST)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasNext)
    )
  }
}
