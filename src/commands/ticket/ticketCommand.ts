import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChannelType, ChatInputCommandInteraction } from 'discord.js'

import { asyncChatInputHandler } from '~/utils/asyncHandleUtil'

import { TicketCloseCommand } from '~/commands/ticket/_ticketCloseCommand'
import { TicketDetailCommand } from '~/commands/ticket/_ticketDetailCommand'
import { TicketListCommand } from '~/commands/ticket/_ticketListCommand'
import { TicketSetupCommand } from '~/commands/ticket/_ticketSetupCommand'

export class TicketCommand extends Subcommand {
  public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: 'ticket',
      description: 'Quản lý hệ thống hỗ trợ thành viên.',
      subcommands: [
        {
          name: 'setup',
          chatInputRun: 'chatInputSetup',
          preconditions: ['OwnerOnly']
        },
        {
          name: 'list',
          chatInputRun: 'chatInputList',
          preconditions: ['AdministratorOnly']
        },
        {
          name: 'detail',
          chatInputRun: 'chatInputDetail',
          preconditions: ['AdministratorOnly']
        },
        {
          name: 'close',
          chatInputRun: 'chatInputClose',
          preconditions: ['AdministratorOnly']
        }
      ]
    })
  }

  public chatInputSetup = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      return TicketSetupCommand.run(interaction)
    }
  )

  public chatInputList = asyncChatInputHandler(async (interaction: ChatInputCommandInteraction) => {
    return TicketListCommand.run(interaction)
  })

  public chatInputDetail = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      return TicketDetailCommand.run(interaction)
    }
  )

  public chatInputClose = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      return TicketCloseCommand.run(interaction)
    }
  )

  registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('ticket')
        .setDescription('Quản lý hệ thống hỗ trợ thành viên.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('setup')
            .setDescription('Thiết lập kênh tiếp nhận và xử lý yêu cầu hỗ trợ từ thành viên.')
            .addChannelOption((option) =>
              option
                .setName('ticket-channel')
                .addChannelTypes(ChannelType.GuildText)
                .setDescription('Kênh tiếp nhận và xử lý yêu cầu hỗ trợ từ thành viên.')
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('close')
            .setDescription('Đóng phiếu hỗ trợ đang mở tại kênh mà bạn dùng lệnh này.')
            .addStringOption((option) =>
              option.setName('reason').setDescription('Lý do đóng phiếu hỗ trợ này.')
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('detail')
            .setDescription('Xem thông tin chi tiết một phiếu hỗ trợ bằng mã phiếu.')
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
            .setDescription('Xem danh sách các phiếu hỗ trợ có trong cơ sở dữ liệu.')
        )
    )
  }
}
