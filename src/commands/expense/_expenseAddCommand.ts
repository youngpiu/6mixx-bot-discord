import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/utils/messageUtil'
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
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const amount = interaction.options.getInteger('amount', true)
    const description = interaction.options.getString('description', true)

    if (amount < EXPENSE_AMOUNT.MIN || amount > EXPENSE_AMOUNT.MAX) {
      throw new NormalError(
        `Số tiền phải từ **${EXPENSE_AMOUNT.MIN.toLocaleString('vi-VN')}đ** đến **${EXPENSE_AMOUNT.MAX.toLocaleString('vi-VN')}đ**.`
      )
    }

    const expense = await ExpenseRepository.createExpense({
      guildId: interaction.guildId,
      amount,
      description,
      createdBy: interaction.user.id
    })

    await InteractionUtil.replySuccess(
      interaction,
      lines(
        `**Mã:** #${expense.code}`,
        `**Số tiền:** ${amount.toLocaleString('vi-VN')}đ`,
        `**Mô tả:** ${description}`
      )
    )
  }
}
