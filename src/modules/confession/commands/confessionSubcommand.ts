// Main confession command router
import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChannelType, ChatInputCommandInteraction } from 'discord.js'

import { ConfessionSetupCommand } from '~/modules/confession/commands/_confessionSetupCommand'

@RegisterChatInputCommand((builder) =>
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
@ApplyOptions<Subcommand.Options>({
  name: 'confession',
  description: 'Quản lý hệ thống Confession.',
  subcommands: [
    {
      name: 'setup',
      chatInputRun: 'chatInputSetup'
    }
  ]
})
export class ConfessionSubcommand extends Subcommand {
  public async chatInputSetup(interaction: ChatInputCommandInteraction) {
    return ConfessionSetupCommand.run(interaction)
  }
}
