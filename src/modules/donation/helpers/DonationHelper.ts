import { container } from '@sapphire/pieces'
import {
  ChannelType,
  Colors,
  ForumChannel,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  TextChannel,
  TextThreadChannel
} from 'discord.js'

import { DonationStatus } from 'generated/prisma/enums'

import { LoggerBuilder } from '~/shared/components/LoggerBuilder'
import { ANIMATED_EMOJI } from '~/shared/constants/emojiConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { MessageUtil } from '~/shared/utils/messageUtil'
import { encryptId } from '~/shared/utils/textUtil'

// Events that trigger donation notifications
type DonationNotificationEvent =
  | 'CREATED'
  | 'PENDING_VERIFICATION'
  | 'CANCELED'
  | 'ADMIN_STATUS_CHANGED'

// Options for sending donation notifications
type DonationNotificationOptions = {
  guildId: string
  donation: {
    code: string
    amount: number
    createdAt: Date
    message?: string | null
    status?: DonationStatus
  }
  event: DonationNotificationEvent
}

// Helper class for donation-related logic and notifications
export class DonationHelper {
  public static getStatusText(status: DonationStatus): string {
    switch (status) {
      case DonationStatus.PENDING:
        return 'Đang chờ'
      case DonationStatus.PENDING_VERIFICATION:
        return 'Chờ xác nhận'
      case DonationStatus.TRANSFERRED:
        return 'Đã chuyển'
      case DonationStatus.CANCELED:
        return 'Đã hủy'
      default:
        return status
    }
  }

  // Sends a notification to the donation notification thread for various donation events
  public static async sendDonationNotification(
    options: DonationNotificationOptions
  ): Promise<void> {
    const { guildId, donation, event } = options

    try {
      const guildConfig = await SettingRepository.find(guildId)
      if (
        !guildConfig?.donationNotificationThreadId ||
        !guildConfig.notificationForumChannelId
      )
        return

      const notificationChannel = (await container.client.channels.fetch(
        guildConfig.notificationForumChannelId
      )) as TextChannel | ForumChannel
      if (
        !notificationChannel ||
        notificationChannel.type !== ChannelType.GuildForum
      )
        return

      const thread = await notificationChannel.threads.fetch(
        guildConfig.donationNotificationThreadId
      )
      if (!thread) return

      let logContainer: LoggerBuilder

      switch (event) {
        case 'CREATED':
          logContainer = this.buildCreatedLog(donation)
          break
        case 'PENDING_VERIFICATION':
          logContainer = this.buildPendingVerificationLog(donation)
          break
        case 'CANCELED':
          logContainer = this.buildCanceledLog(donation)
          break
        case 'ADMIN_STATUS_CHANGED':
          logContainer = this.buildStatusChangeLog(donation)
          break
      }

      await thread.send({
        components: logContainer.build(),
        flags: [MessageFlags.IsComponentsV2]
      })
    } catch (error) {
      container.logger.error(error)
    }
  }

  // Sends a notification to the donation notification thread when a disbursement is added
  public static async sendDisbursementNotification(options: {
    guildId: string
    amount: number
    description: string
    attachmentUrls: string[]
    createdAt?: Date
  }): Promise<string | undefined> {
    const {
      guildId,
      amount,
      description,
      attachmentUrls,
      createdAt = new Date()
    } = options

    try {
      const guildConfig = await SettingRepository.find(guildId)
      if (!guildConfig?.disbursementLogChannelId) return

      const notificationChannel = (await container.client.channels.fetch(
        guildConfig.disbursementLogChannelId
      )) as TextChannel

      if (!notificationChannel || !notificationChannel.isTextBased()) return

      const logContainer = new LoggerBuilder({
        title: `${ANIMATED_EMOJI.WING_LEFT} KHOẢN CHI MỚI ${ANIMATED_EMOJI.WING_RIGHT}`,
        color: Colors.Grey
      })

      logContainer.addFields([
        ['Số tiền', `**${amount.toLocaleString('vi-VN')}đ**`],
        ['Mô tả', `**${description}**`],
        ['Ngày tạo', `<t:${Math.floor(createdAt.getTime() / 1000)}:R>`]
      ])

      const components = logContainer.build()
      const containerComponent = components[0]

      if (attachmentUrls.length > 0) {
        containerComponent
          .addSeparatorComponents((s) => s)
          .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              ...attachmentUrls.map(
                (url) => (item: MediaGalleryItemBuilder) => item.setURL(url)
              )
            )
          )
      }

      const message = await notificationChannel.send({
        components,
        flags: [MessageFlags.IsComponentsV2]
      })

      return message.url
    } catch (error) {
      container.logger.error(error)
    }
  }

  private static buildCreatedLog(
    donation: DonationNotificationOptions['donation']
  ) {
    return this.buildBaseLog(donation, {
      title: 'Quyên Góp Mới',
      timeLabel: 'Thời gian tạo',
      color: Colors.Blue
    })
  }

  private static buildPendingVerificationLog(
    donation: DonationNotificationOptions['donation']
  ) {
    return this.buildBaseLog(donation, {
      title: 'Chờ Xác Nhận',
      timeLabel: 'Ngày tạo',
      color: Colors.Yellow
    })
  }

  private static buildCanceledLog(
    donation: DonationNotificationOptions['donation']
  ) {
    return this.buildBaseLog(donation, {
      title: 'Huỷ Quyên Góp',
      timeLabel: 'Ngày tạo',
      color: Colors.Red
    })
  }

  private static buildStatusChangeLog(
    donation: DonationNotificationOptions['donation']
  ) {
    const statusText = this.getStatusText(donation.status as DonationStatus)

    return this.buildBaseLog(donation, {
      title: 'Chuyển Trạng Thái',
      timeLabel: 'Ngày tạo',
      extraFields: [
        ['Trạng thái mới', `**${statusText}**`],
        ['Ngày thay đổi', `<t:${Math.floor(Date.now() / 1000)}:R>`]
      ],
      color: Colors.Purple
    })
  }

  private static buildBaseLog(
    donation: DonationNotificationOptions['donation'],
    options: {
      title: string
      timeLabel: string
      timeValue?: Date
      extraFields?: [string, string | null | undefined][]
      color?: number
    }
  ): LoggerBuilder {
    const { title, timeLabel, extraFields = [], color } = options

    const builder = new LoggerBuilder({
      title: `${title} \`#${donation.code}\``,
      color
    })

    const fields: [string, string | null | undefined][] = [
      ['Số tiền', `**${donation.amount.toLocaleString('vi-VN')}đ**`],
      ['Lời nhắn', donation.message ? `**${donation.message}**` : undefined],
      [
        timeLabel || 'Ngày tạo',
        `<t:${Math.floor(donation.createdAt.getTime() / 1000)}:R>`
      ],
      ...extraFields
    ]

    builder.addFields(fields.filter((f) => f[1] !== undefined))

    return builder
  }

  public static async sendThankYouMessage(
    guildConfig: Awaited<ReturnType<typeof SettingRepository.find>>,
    donation: { donorId: string; amount: number }
  ) {
    if (!guildConfig?.donationTutorialThreadId) return

    try {
      const thread = (await container.client.channels.fetch(
        guildConfig.donationTutorialThreadId
      )) as TextThreadChannel
      if (!thread) return

      const maskedId = encryptId(donation.donorId)
      const amountStr = donation.amount.toLocaleString('vi-VN')

      await MessageUtil.sendWithContainer(
        thread,
        `${ANIMATED_EMOJI.HEART} Cảm ơn bạn **_${maskedId}_** đã quyên góp **${amountStr}đ**.`
      )
    } catch (error) {
      container.logger.error(error)
    }
  }
}
