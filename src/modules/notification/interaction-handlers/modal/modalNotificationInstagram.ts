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

import { WebhookNotificationService } from '~/modules/notification/services/WebhookNotificationService'
import { InstagramService } from '~/modules/social/services/instagramService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalNotificationInstagramHandler extends InteractionHandler {
  private static readonly MEDIA_FETCH_RETRY = 3
  private static readonly MEDIA_FETCH_TIMEOUT_MS = 10_000
  private static readonly MEDIA_FETCH_RETRY_DELAY_MS = 700

  private static wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private static getExtensionFromContentType(contentType: string | null) {
    if (!contentType) return null

    const type = contentType.split(';')[0]?.trim().toLowerCase()
    if (!type) return null

    if (type === 'image/jpeg') return 'jpg'
    if (type === 'image/png') return 'png'
    if (type === 'image/webp') return 'webp'
    if (type === 'image/gif') return 'gif'
    if (type === 'video/mp4') return 'mp4'
    if (type === 'video/webm') return 'webm'
    if (type === 'video/quicktime') return 'mov'

    const [, subType] = type.split('/')
    if (!subType) return null
    return subType.replace('+xml', '').replace('jpeg', 'jpg')
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_INSTAGRAM) {
      return this.none()
    }
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({
      flags: ['Ephemeral']
    })

    const url = interaction.fields
      .getTextInputValue(CUSTOM_ID.INPUT_INSTAGRAM_URL)
      .trim()
    const member = interaction.fields.getStringSelectValues(
      CUSTOM_ID.SELECT_INSTAGRAM_MEMBER
    )[0]

    let translatedDescription: string | null = null
    try {
      translatedDescription = interaction.fields.getTextInputValue(
        CUSTOM_ID.INPUT_INSTAGRAM_DESC
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

    const shortcode = InstagramService.extractShortcode(url)
    if (!shortcode) {
      return InteractionUtil.replyError(
        interaction,
        'Đường link Instagram không hợp lệ.'
      )
    }

    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    if (!guildConfig || !guildConfig.snsInstagramPostChannelId) {
      return InteractionUtil.replyError(
        interaction,
        'Chưa cài đặt kênh thông báo Instagram. Vui lòng dùng lệnh `/setting` để cài đặt.'
      )
    }

    const channel = (await interaction.guild!.channels.fetch(
      guildConfig.snsInstagramPostChannelId
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

    const igData = await InstagramService.fetchInstagramData(shortcode)

    const webhookClient = new WebhookClient({
      id: webhook.id,
      token: webhook.token!
    })

    try {
      const cleanText =
        translatedDescription && translatedDescription.trim() !== ''
          ? translatedDescription
          : (igData.caption || '').replace(/#\S+/g, '').trim()

      const files: AttachmentBuilder[] = []
      const mediaList = igData.media.slice(0, 10)
      for (const [index, m] of mediaList.entries()) {
        let fetched = false
        let lastErrorMessage = ''

        for (
          let attempt = 1;
          attempt <= ModalNotificationInstagramHandler.MEDIA_FETCH_RETRY;
          attempt++
        ) {
          try {
            const res = await fetch(m.url, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: '*/*',
                Referer: 'https://www.instagram.com/'
              },
              signal: AbortSignal.timeout(
                ModalNotificationInstagramHandler.MEDIA_FETCH_TIMEOUT_MS
              )
            })

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`)
            }

            const arrayBuffer = await res.arrayBuffer()
            const guessedName = m.url.split('/').pop()?.split('?')[0]
            const fallbackExt = m.type === 'video' ? 'mp4' : 'jpg'
            const extFromHeader =
              ModalNotificationInstagramHandler.getExtensionFromContentType(
                res.headers.get('content-type')
              )
            const hasExtension = !!guessedName?.match(/\.[a-z0-9]{2,5}$/i)
            const name = guessedName
              ? hasExtension
                ? guessedName
                : `${guessedName}.${extFromHeader || fallbackExt}`
              : `media-${index}.${extFromHeader || fallbackExt}`
            files.push(
              new AttachmentBuilder(Buffer.from(arrayBuffer), { name })
            )
            fetched = true
            break
          } catch (e) {
            lastErrorMessage = e instanceof Error ? e.message : String(e)
            this.container.logger.warn(
              `[NotificationInstagram] Failed to fetch media ${m.url} (attempt ${attempt}/${ModalNotificationInstagramHandler.MEDIA_FETCH_RETRY}): ${lastErrorMessage}`
            )
            if (attempt < ModalNotificationInstagramHandler.MEDIA_FETCH_RETRY) {
              await ModalNotificationInstagramHandler.wait(
                ModalNotificationInstagramHandler.MEDIA_FETCH_RETRY_DELAY_MS *
                  attempt
              )
            }
          }
        }

        if (!fetched) {
          this.container.logger.error(
            `[NotificationInstagram] Failed to fetch required media after ${ModalNotificationInstagramHandler.MEDIA_FETCH_RETRY} attempts: ${m.url} (${lastErrorMessage})`
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
        sourceUrl: igData.url,
        username: webhook.name,
        avatarURL: webhook.avatarURL() || undefined,
        roleId: guildConfig.snsInstagramRoleId,
        files,
        linkLabel: 'Xem trên Instagram'
      })

      return InteractionUtil.replySuccess(
        interaction,
        `Đã gửi bài viết thành công qua webhook **${member}**!`
      )
    } catch (error) {
      this.container.logger.error(
        '[NotificationInstagram] Error sending webhook:',
        error
      )
      return InteractionUtil.replyError(
        interaction,
        'Có lỗi xảy ra khi gửi tin nhắn qua webhook.'
      )
    }
  }
}
