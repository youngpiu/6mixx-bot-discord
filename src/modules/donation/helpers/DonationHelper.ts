import { container } from '@sapphire/pieces'
import {
  ChannelType,
  Colors,
  ForumChannel,
  MessageFlags,
  TextChannel,
  TextThreadChannel
} from 'discord.js'

import { DonationStatus } from 'generated/prisma/enums'

import { LoggerBuilder } from '~/shared/components/LoggerBuilder'
import { ANIMATED_EMOJI } from '~/shared/constants/emojiConstant'
import { GuildRepository } from '~/shared/repositories/guildRepository'
import { MessageUtil } from '~/shared/utils/messageUtil'
import { encryptId } from '~/shared/utils/textUtil'

/** Events that trigger donation notifications */
type DonationNotificationEvent =
  | 'CREATED'
  | 'PENDING_VERIFICATION'
  | 'CANCELED'
  | 'ADMIN_STATUS_CHANGED'

/** Options for sending donation notifications */
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

export class DonationHelper {
  /**
   * Converts DonationStatus enum to Vietnamese text
   */
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

  /**
   * Sends a notification to the donation notification thread for various donation events.
   * Returns null if logging fails or is not configured (fail-safe).
   */
  public static async sendDonationNotification(
    options: DonationNotificationOptions
  ): Promise<void> {
    const { guildId, donation, event } = options

    try {
      const guildConfig = await GuildRepository.findCached(guildId)
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

  private static buildCreatedLog(
    donation: DonationNotificationOptions['donation']
  ) {
    return this.buildBaseLog(donation, {
      title: 'QUYÊN GÓP MỚI',
      timeLabel: 'Thời gian tạo',
      color: Colors.Blue
    })
  }

  private static buildPendingVerificationLog(
    donation: DonationNotificationOptions['donation']
  ) {
    return this.buildBaseLog(donation, {
      title: 'CHỜ XÁC NHẬN',
      timeLabel: 'Ngày tạo',
      color: Colors.Yellow
    })
  }

  private static buildCanceledLog(
    donation: DonationNotificationOptions['donation']
  ) {
    return this.buildBaseLog(donation, {
      title: 'HỦY QUYÊN GÓP',
      timeLabel: 'Ngày tạo',
      color: Colors.Red
    })
  }

  private static buildStatusChangeLog(
    donation: DonationNotificationOptions['donation']
  ) {
    const statusText = this.getStatusText(donation.status as DonationStatus)

    return this.buildBaseLog(donation, {
      title: 'CHUYỂN TRẠNG THÁI',
      extraFields: [['Trạng thái mới', `**${statusText}**`]],
      timeLabel: 'Ngày thay đổi',
      timeValue: new Date(),
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
    const {
      title,
      timeLabel,
      timeValue = donation.createdAt,
      extraFields = [],
      color
    } = options

    const builder = new LoggerBuilder({ title, color })

    builder.addFields([
      ['Mã giao dịch', `**#${donation.code}**`],
      ['Số tiền', `**${donation.amount.toLocaleString('vi-VN')}đ**`],
      ...extraFields,
      [timeLabel, `<t:${Math.floor(timeValue.getTime() / 1000)}:R>`],
      ['Lời nhắn', donation.message ? `**${donation.message}**` : undefined]
    ])

    return builder
  }

  public static async sendThankYouMessage(
    guildConfig: Awaited<ReturnType<typeof GuildRepository.findCached>>,
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
