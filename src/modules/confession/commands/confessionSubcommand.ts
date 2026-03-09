import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChannelType, ChatInputCommandInteraction } from 'discord.js'

import { ConfessionSetupCommand } from '~/modules/confession/commands/_confessionSetupCommand'

export class ConfessionSubcommand extends Subcommand {
  public constructor(
    context: Subcommand.LoaderContext,
    options: Subcommand.Options
  ) {
    super(context, {
      ...options,
      name: 'confession',
      description: 'Quản lý hệ thống Confession.',
      subcommands: [
        {
          name: 'setup',
          chatInputRun: 'chatInputSetup'
        }
      ]
    })
  }

  public async chatInputSetup(interaction: ChatInputCommandInteraction) {
    return ConfessionSetupCommand.run(interaction)
  }

  registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('confession')
        .setDescription('Quản lý hệ thống Confession.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('setup')
            .setDescription('[OWNER] Thiết lập hệ thống Confession.')
            .addChannelOption((option) =>
              option
                .setName('notification-channel')
                .setDescription('Kênh nhận thông báo duyệt confession')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
            .addChannelOption((option) =>
              option
                .setName('forum-channel')
                .setDescription('Kênh forum để đăng confession')
                .addChannelTypes(ChannelType.GuildForum)
                .setRequired(true)
            )
        )
    )
  }
}
