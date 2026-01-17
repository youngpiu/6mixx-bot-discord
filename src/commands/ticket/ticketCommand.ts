import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChannelType, ChatInputCommandInteraction } from 'discord.js'
import { TicketSendCommand } from '~/commands/ticket/_ticketSendCommand'
import { TicketSetupCommand } from '~/commands/ticket/_ticketSetupCommand'
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
              name: 'setup',
              chatInputRun: 'chatInputSetup',
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

  public chatInputSetup = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      return TicketSetupCommand.run(interaction)
    }
  )

  public chatInputSend = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      return TicketSendCommand.run(interaction)
    }
  )

  registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('ticket')
        .setDescription('Ticket commands')
        .addSubcommandGroup((group) =>
          group
            .setName('config')
            .setDescription('Ticket configuration commands')
            .addSubcommand((subcommand) =>
              subcommand
                .setName('setup')
                .setDescription(
                  'Thiết lập kênh để thành viên có thể góp ý, báo cáo.'
                )
                .addChannelOption((option) =>
                  option
                    .setName('ticket-channel')
                    .addChannelTypes(ChannelType.GuildText)
                    .setDescription('Kênh để thành viên có thể góp ý, báo cáo.')
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
