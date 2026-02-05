import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { asyncChatInputHandler } from '~/utils/asyncHandleUtil'

import { ExpenseAddCommand } from '~/commands/expense/_expenseAddCommand'
import { ExpenseListCommand } from '~/commands/expense/_expenseListCommand'

export class ExpenseSubcommand extends Subcommand {
  public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: 'expense',
      description: 'Quản lý khoản chi.',
      subcommands: [
        {
          name: 'add',
          chatInputRun: 'chatInputAdd',
          preconditions: ['OwnerOnly']
        },
        {
          name: 'list',
          chatInputRun: 'chatInputList',
          preconditions: ['OwnerOnly']
        }
      ]
    })
  }

  public chatInputAdd = asyncChatInputHandler(async (interaction: ChatInputCommandInteraction) => {
    return ExpenseAddCommand.run(interaction)
  })

  public chatInputList = asyncChatInputHandler(async (interaction: ChatInputCommandInteraction) => {
    return ExpenseListCommand.run(interaction)
  })

  registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('expense')
        .setDescription('Quản lý khoản chi.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('add')
            .setDescription('[OWNER] Thêm khoản chi mới.')
            .addIntegerOption((option) =>
              option.setName('amount').setDescription('Số tiền chi').setRequired(true)
            )
            .addStringOption((option) =>
              option.setName('description').setDescription('Mô tả khoản chi').setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand.setName('list').setDescription('[OWNER] Xem danh sách khoản chi.')
        )
    )
  }
}
