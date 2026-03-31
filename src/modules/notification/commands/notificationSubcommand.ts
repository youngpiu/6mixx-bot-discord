import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js'

import { NotificationInstagramCommand } from '~/modules/notification/commands/_notificationInstagramCommand'
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
    .addSubcommand((sub) =>
      sub
        .setName('instagram')
        .setDescription('Đăng bài từ Instagram qua webhook.')
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
    },
    {
      name: 'instagram',
      chatInputRun: 'chatInputInstagram'
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

  public async chatInputInstagram(interaction: ChatInputCommandInteraction) {
    return NotificationInstagramCommand.run(interaction)
  }
}
