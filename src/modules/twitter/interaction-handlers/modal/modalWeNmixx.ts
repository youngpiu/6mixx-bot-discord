import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  AttachmentBuilder,
  ModalSubmitInteraction,
  TextChannel,
  WebhookClient,
  roleMention
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TwitterService } from '~/modules/twitter/services/TwitterService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalWeNmixxHandler extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_WE_NMIXX) {
      return this.none()
    }
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const url = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_WE_NMIXX_URL
    )
    const member = interaction.fields.getStringSelectValues(
      CUSTOM_ID.SELECT_WE_NMIXX_MEMBER
    )[0]

    // Attempt to get the translated description; if left empty, it will be an empty string.
    let translatedDescription: string | null = null
    try {
      translatedDescription = interaction.fields.getTextInputValue(
        CUSTOM_ID.INPUT_WE_NMIXX_DESC
      )
    } catch {
      // It's optional, so if not found, just ignore it.
    }

    if (!member) {
      return InteractionUtil.replyError(
        interaction,
        'Bạn chưa chọn thành viên nào.'
      )
    }

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

      const cleanText =
        translatedDescription && translatedDescription.trim() !== ''
          ? translatedDescription
          : tweetInfo.text.replace(/#\S+/g, '').trim()

      // Build content
      const content = `**[${cleanText}](<${url}>)**\n\n${rolePing}`.trim()

      // Tải hình ảnh/video về buffer
      const files: AttachmentBuilder[] = []
      for (const [index, m] of tweetInfo.media.slice(0, 10).entries()) {
        try {
          const res = await fetch(m.url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          })
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer()
            const name =
              m.url.split('/').pop()?.split('?')[0] || `media-${index}.jpg`
            files.push(
              new AttachmentBuilder(Buffer.from(arrayBuffer), { name })
            )
          } else {
            this.container.logger.warn(
              `[WeNmixxCommand] Media fetch returned status ${res.status} for ${m.url}`
            )
          }
        } catch (e) {
          this.container.logger.error(
            `[WeNmixxCommand] Failed to fetch media ${m.url}:`,
            e
          )
        }
      }

      await webhookClient.send({
        content: content || url,
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
