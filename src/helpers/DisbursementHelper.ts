import { container } from '@sapphire/pieces'
import { ChannelType, ContainerBuilder, ForumChannel, TextChannel } from 'discord.js'

import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'

/** Options for sending disbursement notifications */
type DisbursementNotificationOptions = {
  guildId: string
  disbursement: {
    amount: number
    description: string
    createdAt: Date
    createdBy: string
  }
}

export class DisbursementHelper {
  /**
   * Sends a notification to the donation notification thread for disbursement events.
   */
  public static async sendDisbursementNotification(
    options: DisbursementNotificationOptions
  ): Promise<void> {
    try {
      const { guildId, disbursement } = options

      const guildConfig = await GuildRepository.getGuildCached(guildId)
      if (!guildConfig?.notificationForumChannelId || !guildConfig?.donationNotificationThreadId) {
        return
      }

      const notificationChannel = (await container.client.channels.fetch(
        guildConfig.notificationForumChannelId
      )) as TextChannel | ForumChannel
      if (!notificationChannel || notificationChannel.type !== ChannelType.GuildForum) return

      const thread = await notificationChannel.threads.fetch(
        guildConfig.donationNotificationThreadId
      )
      if (!thread) return

      const logContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`## GIẢI NGÂN`))
        .addSeparatorComponents((sep) => sep)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            lines(
              `- **Số tiền:** ${disbursement.amount.toLocaleString('vi-VN')}đ`,
              `- **Mô tả:** ${disbursement.description}`,
              `- **Người tạo:** <@${disbursement.createdBy}>`,
              `- **Thời gian:** <t:${Math.floor(disbursement.createdAt.getTime() / 1000)}:R>`
            )
          )
        )

      await thread.send({
        components: [logContainer],
        flags: ['IsComponentsV2']
      })
    } catch (error) {
      // Fail-safe: log error but don't throw
      console.error('Failed to send disbursement notification:', error)
    }
  }
}
