import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChannelType, ChatInputCommandInteraction } from 'discord.js'
import { TicketConfigSendCommand } from '~/commands/ticket/_ticketConfigSendCommand'
import { TicketConfigChannelCommand } from '~/commands/ticket/_ticketConfigChannelCommand'
import { asyncChatInputHandler } from '~/utils/asyncHandleUtil'

export class TicketCommand extends Subcommand {
  public constructor(
    context: Subcommand.LoaderContext,
    options: Subcommand.Options
  ) {
    super(context, {
      ...options,
      name: 'ticket',
      description: 'Ticket commands',
      subcommands: [
        {
          name: 'config',
          type: 'group',
          entries: [
            {
              name: 'channel',
              chatInputRun: 'chatInputChannel',
              preconditions: ['OwnerOnly']
            },
            {
              name: 'send',
              chatInputRun: 'chatInputSend',
              preconditions: ['OwnerOnly']
            }
          ]
        }
      ]
    })
  }

  public chatInputChannel = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      return TicketConfigChannelCommand.run(interaction)
    }
  )

  public chatInputSend = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      return TicketConfigSendCommand.run(interaction)
    }
  )

  registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('ticket')
        .setDescription('ticket')
        .addSubcommandGroup((group) =>
          group
            .setName('config')
            .setDescription('ticket-config')
            .addSubcommand((subcommand) =>
              subcommand
                .setName('channel')
                .setDescription(
                  'Thiết lập kênh để thành viên có thể gửi các yêu cầu hỗ trợ tới Ban Quản Lý.'
                )
                .addChannelOption((option) =>
                  option
                    .setName('ticket-channel')
                    .addChannelTypes(ChannelType.GuildText)
                    .setDescription(
                      'Kênh để thành viên có gửi các yêu cầu hỗ trợ tới Ban Quản Lý.'
                    )
                    .setRequired(true)
                )
            )
            .addSubcommand((subcommand) =>
              subcommand
                .setName('send')
                .setDescription(
                  'Gửi tin nhắn chứa hướng dẫn sử dụng tới kênh đã được thiết lập.'
                )
            )
        )
    )
  }
}
