import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { Expense, Member } from 'generated/prisma/client'

import { DEFAULT_PAGINATION_LIMIT } from '~/constants/commonConstant'
import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'

import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { ExpenseRepository } from '~/repositories/expenseRepository'

type ExpenseWithCreator = Expense & { creator: Member }

export class ExpenseListCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const { items, meta } = await ExpenseRepository.getExpenses({
      guildId: interaction.guildId,
      page: 1,
      limit: DEFAULT_PAGINATION_LIMIT
    })

    await interaction.editReply(this.createListResponse(items, meta))
    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.MEDIUM)
  }

  public static async handleButton(interaction: ButtonInteraction, page: number) {
    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const { items, meta } = await ExpenseRepository.getExpenses({
      guildId: interaction.guildId,
      page,
      limit: DEFAULT_PAGINATION_LIMIT
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
        .setLabel('⏮️ Đầu')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasPrev),
      new ButtonBuilder()
        .setCustomId(`expense-list:prev:${meta.page - 1}`)
        .setLabel('◀️ Trước')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasPrev),
      new ButtonBuilder()
        .setCustomId(`expense-list:next:${meta.page + 1}`)
        .setLabel('Sau ▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasNext),
      new ButtonBuilder()
        .setCustomId(`expense-list:last:${meta.totalPages}`)
        .setLabel('Cuối ⏭️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!meta.hasNext)
    )

    return { embeds: [embed], components: [navRow] }
  }
}
