import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  AttachmentBuilder,
  ModalSubmitInteraction,
  TextChannel,
  WebhookClient
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TwitterService } from '~/modules/notification/services/TwitterService'
import { WebhookNotificationService } from '~/modules/notification/services/WebhookNotificationService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalNotificationWeNmixxHandler extends InteractionHandler {
  private static readonly MEDIA_FETCH_RETRY = 3
  private static readonly MEDIA_FETCH_TIMEOUT_MS = 10_000
  private static readonly MEDIA_FETCH_RETRY_DELAY_MS = 700

  private static wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

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

    const url = interaction.fields
      .getTextInputValue(CUSTOM_ID.INPUT_WE_NMIXX_URL)
      .trim()
    const member = interaction.fields.getStringSelectValues(
      CUSTOM_ID.SELECT_WE_NMIXX_MEMBER
    )[0]

    let translatedDescription: string | null = null
    try {
      translatedDescription = interaction.fields.getTextInputValue(
        CUSTOM_ID.INPUT_WE_NMIXX_DESC
      )
    } catch {
      // Optional field
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
      const cleanText =
        translatedDescription && translatedDescription.trim() !== ''
          ? translatedDescription
          : tweetInfo.text.replace(/#\S+/g, '').trim()

      // Tải hình ảnh/video về buffer (bắt buộc tải đủ tất cả media)
      const files: AttachmentBuilder[] = []
      const mediaList = tweetInfo.media.slice(0, 10)
      for (const [index, m] of mediaList.entries()) {
        let fetched = false
        let lastErrorMessage = ''

        for (
          let attempt = 1;
          attempt <= ModalNotificationWeNmixxHandler.MEDIA_FETCH_RETRY;
          attempt++
        ) {
          try {
            const res = await fetch(m.url, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                Referer: 'https://x.com/'
              },
              signal: AbortSignal.timeout(
                ModalNotificationWeNmixxHandler.MEDIA_FETCH_TIMEOUT_MS
              )
            })

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`)
            }

            const arrayBuffer = await res.arrayBuffer()
            const name =
              m.url.split('/').pop()?.split('?')[0] || `media-${index}.jpg`
            files.push(
              new AttachmentBuilder(Buffer.from(arrayBuffer), { name })
            )
            fetched = true
            break
          } catch (e) {
            lastErrorMessage = e instanceof Error ? e.message : String(e)
            this.container.logger.warn(
              `[NotificationWeNmixx] Failed to fetch media ${m.url} (attempt ${attempt}/${ModalNotificationWeNmixxHandler.MEDIA_FETCH_RETRY}): ${lastErrorMessage}`
            )
            if (attempt < ModalNotificationWeNmixxHandler.MEDIA_FETCH_RETRY) {
              await ModalNotificationWeNmixxHandler.wait(
                ModalNotificationWeNmixxHandler.MEDIA_FETCH_RETRY_DELAY_MS *
                  attempt
              )
            }
          }
        }

        if (!fetched) {
          this.container.logger.error(
            `[NotificationWeNmixx] Failed to fetch required media after ${ModalNotificationWeNmixxHandler.MEDIA_FETCH_RETRY} attempts: ${m.url} (${lastErrorMessage})`
          )
          return InteractionUtil.replyError(
            interaction,
            'Không thể tải đầy đủ media của bài viết sau 3 lần thử. Vui lòng thử lại sau.'
          )
        }
      }

      await WebhookNotificationService.send({
        webhookClient,
        title: `\`\`\`${cleanText}\`\`\``,
        sourceUrl: url,
        username: webhook.name,
        avatarURL: webhook.avatarURL() || undefined,
        roleId: guildConfig.weNmixxNotificationRoleId,
        files,
        linkLabel: 'Xem trên X'
      })

      return InteractionUtil.replySuccess(
        interaction,
        `Đã gửi bài viết thành công qua webhook **${member}**!`
      )
    } catch (error) {
      this.container.logger.error(
        '[NotificationWeNmixx] Error sending webhook:',
        error
      )
      return InteractionUtil.replyError(
        interaction,
        'Có lỗi xảy ra khi gửi tin nhắn qua webhook.'
      )
    }
  }
}
