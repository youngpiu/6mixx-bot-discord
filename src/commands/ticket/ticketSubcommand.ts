import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { asyncChatInputHandler } from '~/utils/asyncHandleUtil'

import { TicketDetailCommand } from '~/commands/ticket/_ticketDetailCommand'
import { TicketListCommand } from '~/commands/ticket/_ticketListCommand'

export class TicketSubcommand extends Subcommand {
  public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: 'ticket',
      description: 'Hệ thống hỗ trợ thành viên.',
      subcommands: [
        {
          name: 'list',
          chatInputRun: 'chatInputList',
          preconditions: ['AdministratorOnly']
        },
        {
          name: 'detail',
          chatInputRun: 'chatInputDetail',
          preconditions: ['AdministratorOnly']
        }
      ]
    })
  }

  public chatInputList = asyncChatInputHandler(async (interaction: ChatInputCommandInteraction) => {
    return TicketListCommand.run(interaction)
  })

  public chatInputDetail = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      return TicketDetailCommand.run(interaction)
    }
  )

  registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('ticket')
        .setDescription('Quản lý hệ thống hỗ trợ thành viên.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('detail')
            .setDescription(
              '[ADMINISTRATOR] Xem thông tin chi tiết một phiếu hỗ trợ bằng mã phiếu.'
            )
            .addStringOption((option) =>
              option
                .setName('ticket-id')
                .setDescription('Mã phiếu hỗ trợ mà bạn muốn xem chi tiết.')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('list')
            .setDescription(
              '[ADMINISTRATOR] Xem danh sách các phiếu hỗ trợ có trong cơ sở dữ liệu.'
            )
        )
    )
  }
}
