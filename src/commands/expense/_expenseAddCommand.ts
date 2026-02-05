import { ChatInputCommandInteraction } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'

import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

import { ExpenseRepository } from '~/repositories/expenseRepository'

const EXPENSE_AMOUNT = {
  MIN: 1000,
  MAX: 100000000
} as const

export class ExpenseAddCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const amount = interaction.options.getInteger('amount', true)
    const description = interaction.options.getString('description', true)

    if (amount < EXPENSE_AMOUNT.MIN || amount > EXPENSE_AMOUNT.MAX) {
      throw new BadRequestError({
        description: `Số tiền phải từ **${EXPENSE_AMOUNT.MIN.toLocaleString('vi-VN')}đ** đến **${EXPENSE_AMOUNT.MAX.toLocaleString('vi-VN')}đ**.`
      })
    }

    const expense = await ExpenseRepository.createExpense({
      guildId: interaction.guildId,
      amount,
      description,
      createdBy: interaction.user.id
    })

    const embed = createSuccessEmbed({
      title: 'Đã thêm khoản chi',
      description: lines(
        `**Mã:** #${expense.code}`,
        `**Số tiền:** ${amount.toLocaleString('vi-VN')}đ`,
        `**Mô tả:** ${description}`
      )
    })

    await interaction.editReply({ embeds: [embed] })
    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.SHORT)
  }
}
