import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChannelType, ChatInputCommandInteraction } from 'discord.js'
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
          name: 'setup',
          chatInputRun: 'chatInputSetup',
          preconditions: ['OwnerOnly']
        }
      ]
    })
  }

  public chatInputSetup = asyncChatInputHandler(
    async (interaction: ChatInputCommandInteraction) => {
      return TicketSetupCommand.run(interaction)
    }
  )

  registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('ticket')
        .setDescription('ticket')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('setup')
            .setDescription(
              'Thiết lập kênh hỗ trợ và gửi hướng dẫn cho thành viên.'
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
    )
  }
}
