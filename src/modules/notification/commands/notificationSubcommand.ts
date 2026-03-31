import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js'

import { NotificationTwitterCommand } from '~/modules/notification/commands/_notificationTwitterCommand'
import { NotificationYouTubeCommand } from '~/modules/notification/commands/_notificationYouTubeCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('notification')
    .setDescription('Gửi thông báo qua webhook.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName('youtube').setDescription('Gửi thông báo video YouTube.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('twitter')
        .setDescription('Đăng bài từ X/Twitter qua webhook.')
    )
)
@ApplyOptions<Subcommand.Options>({
  name: 'notification',
  description: 'Gửi thông báo qua webhook.',
  preconditions: ['GuildOnly', 'NotificationPermission'],
  subcommands: [
    {
      name: 'youtube',
      chatInputRun: 'chatInputYouTube'
    },
    {
      name: 'twitter',
      chatInputRun: 'chatInputTwitter'
    }
  ]
})
export class NotificationSubcommand extends Subcommand {
  public async chatInputYouTube(interaction: ChatInputCommandInteraction) {
    return NotificationYouTubeCommand.run(interaction)
  }

  public async chatInputTwitter(interaction: ChatInputCommandInteraction) {
    return NotificationTwitterCommand.run(interaction)
  }
}
