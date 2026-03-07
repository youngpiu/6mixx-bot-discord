import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js'

// @ts-expect-error - Prisma generated types mismatch
import { Expense, Member } from 'generated/prisma/client'

import { NormalError } from '~/core/errorResponse'

import { ExpenseRepository } from '~/repositories/expenseRepository'

type ExpenseWithCreator = Expense & { creator: Member }

export class ExpenseListCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const { items, meta } = await ExpenseRepository.getExpenses({
      guildId: interaction.guildId,
      page: 1,
      limit: 10
    })

    await interaction.editReply(this.createListResponse(items, meta))
  }

  public static async handleButton(interaction: ButtonInteraction, page: number) {
    if (!interaction.guildId) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const { items, meta } = await ExpenseRepository.getExpenses({
      guildId: interaction.guildId,
      page,
      limit: 10
    })

    await interaction.update(this.createListResponse(items, meta))
  }

  public static createListResponse(
    expenses: Expense[],
    meta: {
      page: number
      total: number
      totalPages: number
      limit: number
      hasNext: boolean
      hasPrev: boolean
    }
  ) {
    const embed = new EmbedBuilder().setTitle('Danh sách khoản chi').setColor(0xed4245)

    if (expenses.length === 0) {
      embed.setDescription('Không có khoản chi nào.')
    } else {
      expenses.forEach((expense, index) => {
        const createdTimestamp = Math.floor(expense.createdAt.getTime() / 1000)
        const indexNumber = (meta.page - 1) * meta.limit + index + 1

        embed.addFields({
          name: `${indexNumber}. #${expense.code}`,
          value: [
            `**Số tiền:** ${expense.amount.toLocaleString('vi-VN')}đ`,
            `**Mô tả:** ${expense.description}`,
            `**Người tạo:** <@${(expense as ExpenseWithCreator).creator?.userId || expense.createdBy}>`,
            `**Thời gian:** <t:${createdTimestamp}:R>`
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
        .setCustomId('expense-list:first:1')
        .setLabel('⏮️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasPrev),
      new ButtonBuilder()
        .setCustomId(`expense-list:prev:${meta.page - 1}`)
        .setLabel('◀️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasPrev),
      new ButtonBuilder()
        .setCustomId(`expense-list:next:${meta.page + 1}`)
        .setLabel('▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasNext),
      new ButtonBuilder()
        .setCustomId(`expense-list:last:${meta.totalPages}`)
        .setLabel('⏭️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasNext)
    )

    return { embeds: [embed], components: [navRow] }
  }
}
