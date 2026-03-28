import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import {
  ChatInputCommandInteraction,
  TextChannel,
  WebhookClient,
  roleMention
} from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TwitterService } from '~/modules/twitter/services/TwitterService'

const MEMBERS = [
  'Haewon',
  'Lily',
  'Sullyoon',
  'Bae',
  'Jiwoo',
  'Kyujin'
] as const
type MemberName = (typeof MEMBERS)[number]

@RegisterChatInputCommand((builder) =>
  builder
    .setName('we-nmixx')
    .setDescription('Đăng bài từ X/Twitter với webhook của thành viên')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('Đường dẫn bài viết X/Twitter')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('member')
        .setDescription('Tên thành viên NMIXX')
        .setRequired(true)
        .addChoices(...MEMBERS.map((m) => ({ name: m, value: m })))
    )
)
@ApplyOptions<Command.Options>({
  name: 'we-nmixx',
  description: 'Đăng bài từ X/Twitter với webhook của thành viên',
  preconditions: ['GuildOnly']
})
export class WeNmixxCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const url = interaction.options.getString('url', true)
    const member = interaction.options.getString('member', true) as MemberName

    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    if (!guildConfig || !guildConfig.weNmixxNotificationChannelId) {
      return InteractionUtil.replyError(
        interaction,
        'Chưa cài đặt kênh thông báo WE_NMIXX. Vui lòng dùng lệnh `/setting` để cài đặt.'
      )
    }

    const channel = (await interaction.guild!.channels.fetch(
      guildConfig.weNmixxNotificationChannelId
    )) as TextChannel | null

    if (!channel || !channel.isTextBased()) {
      return InteractionUtil.replyError(
        interaction,
        'Kênh thông báo không hợp lệ hoặc không tồn tại.'
      )
    }

    const webhooks = await channel.fetchWebhooks()
    const webhook = webhooks.find(
      (wh) => wh.name.toLowerCase() === member.toLowerCase()
    )

    if (!webhook) {
      return InteractionUtil.replyError(
        interaction,
        `Không tìm thấy webhook có tên **${member}** trong kênh ${channel}. Vui lòng tạo thủ công webhook có tên là \`${member}\` trong kênh đó.`
      )
    }

    const tweetInfo = await TwitterService.getTweetInfo(url)
    if (!tweetInfo) {
      return InteractionUtil.replyError(
        interaction,
        'Không thể lấy thông tin bài viết. Vui lòng kiểm tra lại đường dẫn.'
      )
    }

    const webhookClient = new WebhookClient({
      id: webhook.id,
      token: webhook.token!
    })

    try {
      const rolePing = guildConfig.weNmixxNotificationRoleId
        ? `${roleMention(guildConfig.weNmixxNotificationRoleId)}\n`
        : ''

      const cleanText = tweetInfo.text.replace(/#\S+/g, '').trim()

      // Build content
      const content = `${cleanText}\n\n${rolePing}`.trim()
      const files = tweetInfo.media.slice(0, 10).map((m) => m.url)

      await webhookClient.send({
        content: content.trim() || url,
        username: webhook.name,
        avatarURL: webhook.avatarURL() || undefined,
        files: files.length > 0 ? files : undefined
      })

      return InteractionUtil.replySuccess(
        interaction,
        `Đã gửi bài viết thành công qua webhook **${member}**!`
      )
    } catch (error) {
      this.container.logger.error(
        '[WeNmixxCommand] Error sending webhook:',
        error
      )
      return InteractionUtil.replyError(
        interaction,
        'Có lỗi xảy ra khi gửi tin nhắn qua webhook.'
      )
    }
  }
}
