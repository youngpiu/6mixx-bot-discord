import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js'

import { NotificationWeNmixxCommand } from '~/modules/notification/commands/_notificationWeNmixxCommand'
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
        .setName('we-nmixx')
        .setDescription(
          'Đăng bài từ X/Twitter với webhook của thành viên WE_NMIXX.'
        )
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
      name: 'we-nmixx',
      chatInputRun: 'chatInputWeNmixx'
    }
  ]
})
export class NotificationSubcommand extends Subcommand {
  public async chatInputYouTube(interaction: ChatInputCommandInteraction) {
    return NotificationYouTubeCommand.run(interaction)
  }

  public async chatInputWeNmixx(interaction: ChatInputCommandInteraction) {
    return NotificationWeNmixxCommand.run(interaction)
  }
}
