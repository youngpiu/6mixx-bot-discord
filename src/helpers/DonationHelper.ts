import { container } from '@sapphire/pieces'
import {
  ChannelType,
  ContainerBuilder,
  ForumChannel,
  MessageFlags,
  TextChannel,
  ThreadChannel
} from 'discord.js'

import { DonationStatus } from 'generated/prisma/enums'

import { ANIMATED_EMOJI } from '~/constants/emojiConstant'

import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'

/** Events that trigger donation notifications */
type DonationNotificationEvent =
  | 'CREATED'
  | 'PENDING_VERIFICATION'
  | 'CANCELED'
  | 'AUTO_CANCELED'
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
      const guildConfig = await GuildRepository.getGuildCached(guildId)
      if (!guildConfig?.donationNotificationThreadId || !guildConfig.notificationForumChannelId)
        return

      const notificationChannel = (await container.client.channels.fetch(
        guildConfig.notificationForumChannelId
      )) as TextChannel | ForumChannel
      if (!notificationChannel || notificationChannel.type !== ChannelType.GuildForum) return

      const thread = await notificationChannel.threads.fetch(
        guildConfig.donationNotificationThreadId
      )
      if (!thread) return

      const logContainer = new ContainerBuilder()

      switch (event) {
        case 'CREATED':
          this.buildCreatedLog(logContainer, donation)
          break
        case 'PENDING_VERIFICATION':
          this.buildPendingVerificationLog(logContainer, donation)
          break
        case 'CANCELED':
          this.buildCanceledLog(logContainer, donation)
          break
        case 'AUTO_CANCELED':
          this.buildAutoCanceledLog(logContainer, donation)
          break
        case 'ADMIN_STATUS_CHANGED':
          this.buildStatusChangeLog(logContainer, donation)
          break
      }

      await thread.send({
        components: [logContainer],
        flags: [MessageFlags.IsComponentsV2]
      })
    } catch (error) {
      container.logger.error(error)
    }
  }

  private static buildCreatedLog(
    container: ContainerBuilder,
    donation: DonationNotificationOptions['donation']
  ) {
    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`## QUYÊN GÓP MỚI - #${donation.code}`)
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          lines(
            `- **Số tiền:** ${donation.amount.toLocaleString('vi-VN')}đ`,
            `- **Thời gian tạo:** <t:${Math.floor(donation.createdAt.getTime() / 1000)}:R>`,
            donation.message && `- **Lời nhắn:** ${donation.message}`
          )
        )
      )
  }

  private static buildPendingVerificationLog(
    container: ContainerBuilder,
    donation: DonationNotificationOptions['donation']
  ) {
    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`## CHỜ XÁC NHẬN - #${donation.code}`)
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          lines(
            `- **Số tiền:** ${donation.amount.toLocaleString('vi-VN')}đ`,
            `- **Thời gian tạo:** <t:${Math.floor(donation.createdAt.getTime() / 1000)}:R>`,
            `- **Thời gian xác nhận:** <t:${Math.floor(new Date().getTime() / 1000)}:R>`,
            donation.message && `- **Lời nhắn:** ${donation.message}`
          )
        )
      )
  }

  private static buildCanceledLog(
    container: ContainerBuilder,
    donation: DonationNotificationOptions['donation']
  ) {
    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`## HỦY QUYÊN GÓP - #${donation.code}`)
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          lines(
            `- **Số tiền:** ${donation.amount.toLocaleString('vi-VN')}đ`,
            `- **Thời gian tạo:** <t:${Math.floor(donation.createdAt.getTime() / 1000)}:R>`,
            `- **Thời gian hủy:** <t:${Math.floor(new Date().getTime() / 1000)}:R>`,
            donation.message && `- **Lời nhắn:** ${donation.message}`
          )
        )
      )
  }

  private static buildAutoCanceledLog(
    container: ContainerBuilder,
    donation: DonationNotificationOptions['donation']
  ) {
    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`## TỰ ĐỘNG HỦY QUYÊN GÓP - #${donation.code}`)
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          lines(
            `- **Số tiền:** ${donation.amount.toLocaleString('vi-VN')}đ`,
            `- **Thời gian tạo:** <t:${Math.floor(donation.createdAt.getTime() / 1000)}:R>`,
            `- **Thời gian hủy:** <t:${Math.floor(new Date().getTime() / 1000)}:R>`,
            `- **Lý do:** Quá thời gian xác nhận (10 phút)`,
            donation.message && `- **Lời nhắn:** ${donation.message}`
          )
        )
      )
  }

  private static buildStatusChangeLog(
    container: ContainerBuilder,
    donation: DonationNotificationOptions['donation']
  ) {
    const statusText = this.getStatusText(donation.status as DonationStatus)

    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`## CHUYỂN TRẠNG THÁI - #${donation.code}`)
      )
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          lines(
            `- **Số tiền:** ${donation.amount.toLocaleString('vi-VN')}đ`,
            `- **Trạng thái mới:** ${statusText}`,
            `- **Thời gian thay đổi:** <t:${Math.floor(new Date().getTime() / 1000)}:R>`,
            donation.message && `- **Lời nhắn:** ${donation.message}`
          )
        )
      )
  }

  public static async sendThankYouMessage(
    guildConfig: Awaited<ReturnType<typeof GuildRepository.getGuildCached>>,
    donation: { donorId: string; amount: number }
  ) {
    if (!guildConfig?.donationTutorialThreadId) return

    try {
      const thread = (await container.client.channels.fetch(
        guildConfig.donationTutorialThreadId
      )) as ThreadChannel
      if (!thread) return

      const maskedId = `xxxxx${donation.donorId.slice(5, -5)}xxxxx`
      const amountStr = donation.amount.toLocaleString('vi-VN')

      await thread.send(
        `${ANIMATED_EMOJI.HEART} Cảm ơn bạn **_${maskedId}_** đã quyên góp **${amountStr}đ**.`
      )
    } catch (error) {
      container.logger.error(error)
    }
  }
}
