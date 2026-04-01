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
import { normalizeMultilineText } from '~/shared/utils/textUtil'

import { TwitterService } from '~/modules/notification/services/TwitterService'
import { WebhookNotificationService } from '~/modules/notification/services/WebhookNotificationService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalNotificationTwitterHandler extends InteractionHandler {
  private static readonly MEDIA_FETCH_RETRY = 3
  private static readonly MEDIA_FETCH_TIMEOUT_MS = 10_000
  private static readonly MEDIA_FETCH_RETRY_DELAY_MS = 700

  private static wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_TWITTER) {
      return this.none()
    }
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const url = interaction.fields
      .getTextInputValue(CUSTOM_ID.INPUT_TWITTER_URL)
      .trim()
    const member = interaction.fields.getStringSelectValues(
      CUSTOM_ID.SELECT_TWITTER_MEMBER
    )[0]

    let translatedDescription: string | null = null
    try {
      translatedDescription = interaction.fields.getTextInputValue(
        CUSTOM_ID.INPUT_TWITTER_DESC
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
    if (!guildConfig || !guildConfig.snsTwitterPostChannelId) {
      return InteractionUtil.replyError(
        interaction,
        'Chưa cài đặt kênh thông báo Twitter. Vui lòng dùng lệnh `/setting` để cài đặt.'
      )
    }

    const channel = (await interaction.guild!.channels.fetch(
      guildConfig.snsTwitterPostChannelId
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
      await channel.createWebhook({
        name: member
      })

      return InteractionUtil.replyError(
        interaction,
        `Đã tự động tạo webhook **${member}**. Bạn cần cập nhật avatar cho webhook này trong phần Cài đặt kênh trước khi thực hiện gửi lại yêu cầu.`
      )
    }

    if (!webhook.avatarURL()) {
      return InteractionUtil.replyError(
        interaction,
        `Webhook **${member}** hiện đang thiếu avatar. Bạn cần cập nhật avatar cho webhook này để thông báo trông đẹp mắt nhất trước khi gửi lại bài.`
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
          ? normalizeMultilineText(translatedDescription)
          : normalizeMultilineText(tweetInfo.text.replace(/#\S+/g, ''))

      // Tải hình ảnh/video về buffer (bắt buộc tải đủ tất cả media)
      const files: AttachmentBuilder[] = []
      const mediaList = tweetInfo.media
      for (const [index, m] of mediaList.entries()) {
        let fetched = false
        let lastErrorMessage = ''

        for (
          let attempt = 1;
          attempt <= ModalNotificationTwitterHandler.MEDIA_FETCH_RETRY;
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
                ModalNotificationTwitterHandler.MEDIA_FETCH_TIMEOUT_MS
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
              `[NotificationTwitter] Failed to fetch media ${m.url} (attempt ${attempt}/${ModalNotificationTwitterHandler.MEDIA_FETCH_RETRY}): ${lastErrorMessage}`
            )
            if (attempt < ModalNotificationTwitterHandler.MEDIA_FETCH_RETRY) {
              await ModalNotificationTwitterHandler.wait(
                ModalNotificationTwitterHandler.MEDIA_FETCH_RETRY_DELAY_MS *
                  attempt
              )
            }
          }
        }

        if (!fetched) {
          this.container.logger.error(
            `[NotificationTwitter] Failed to fetch required media after ${ModalNotificationTwitterHandler.MEDIA_FETCH_RETRY} attempts: ${m.url} (${lastErrorMessage})`
          )
          return InteractionUtil.replyError(
            interaction,
            'Không thể tải đầy đủ media của bài viết sau 3 lần thử. Vui lòng thử lại sau.'
          )
        }
      }

      await WebhookNotificationService.send({
        webhookClient,
        title: cleanText.trim() ? `\`\`\`${cleanText}\`\`\`` : '',
        sourceUrl: url,
        username: webhook.name,
        avatarURL: webhook.avatarURL() || undefined,
        roleId: guildConfig.snsTwitterRoleId,
        files,
        linkLabel: 'Xem trên X',
        splitFilesIntoFollowUps: true
      })

      return InteractionUtil.replySuccess(
        interaction,
        `Đã gửi bài viết thành công qua webhook **${member}**!`
      )
    } catch (error) {
      this.container.logger.error(
        '[NotificationTwitter] Error sending webhook:',
        error
      )
      return InteractionUtil.replyError(
        interaction,
        'Có lỗi xảy ra khi gửi tin nhắn qua webhook.'
      )
    }
  }
}
