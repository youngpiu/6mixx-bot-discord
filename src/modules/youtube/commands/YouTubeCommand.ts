import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import { ChatInputCommandInteraction, GuildMember } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'

import { YouTubeNotificationService } from '~/modules/youtube/services/YouTubeNotificationService'

@ApplyOptions<Command.Options>({
  name: 'youtube',
  description: 'Gửi thông báo video YouTube từ link.',
  preconditions: ['GuildOnly']
})
export class YouTubeCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
          option
            .setName('url')
            .setDescription('Link video YouTube')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('translated-title')
            .setDescription('Tiêu đề đã dịch (tùy chọn)')
            .setRequired(false)
        )
    )
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString('url', true)
    const overrideTitle =
      interaction.options.getString('translated-title') || undefined
    const guildId = interaction.guildId!

    const guildConfig = await SettingRepository.find(guildId)

    // Check role permission
    if (
      guildConfig?.youtubeNotificationAllowedRoleIds &&
      guildConfig.youtubeNotificationAllowedRoleIds.length > 0 &&
      !interaction.memberPermissions?.has('Administrator')
    ) {
      const member = interaction.member as GuildMember
      if (
        !member?.roles.cache.hasAny(
          ...guildConfig.youtubeNotificationAllowedRoleIds
        )
      ) {
        return interaction.reply({
          content: 'Bạn không có quyền sử dụng lệnh này.',
          flags: ['Ephemeral']
        })
      }
    }

    await interaction.deferReply({ flags: ['Ephemeral'] })

    const success = await YouTubeNotificationService.processAndNotify(
      guildId,
      url,
      overrideTitle
    )

    if (success) {
      return interaction.editReply({
        content: 'Đã gửi thông báo thành công!'
      })
    } else {
      return interaction.editReply({
        content:
          'Đã có lỗi xảy ra khi xử lý link YouTube. Vui lòng kiểm tra lại link hoặc cấu hình bot.'
      })
    }
  }
}
