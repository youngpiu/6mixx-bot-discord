import { container } from '@sapphire/pieces'
import { Colors, MessageFlags } from 'discord.js'

import { ConfessionStatus } from 'generated/prisma/enums'

import { LoggerBuilder } from '~/shared/components/LoggerBuilder'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { MessageUtil } from '~/shared/utils/messageUtil'

type ConfessionLogEvent = 'SUBMITTED' | 'APPROVED' | 'REJECTED'

type ConfessionLogOptions = {
  guildId: string
  confession: {
    code: string
    content: string
    isAnonymous: boolean
    authorId?: string
    createdAt: Date
  }
  event: ConfessionLogEvent
  executorId?: string
}

export class ConfessionHelper {
  public static getStatusLabel(status: ConfessionStatus) {
    switch (status) {
      case 'PENDING':
        return 'Chờ duyệt'
      case 'APPROVED':
        return 'Đã duyệt'
      case 'REJECTED':
        return 'Từ chối'
      default:
        return 'Không rõ'
    }
  }

  // Sends a structured log to the confessionNotificationThreadId thread on status change
  public static async sendConfessionLog(
    options: ConfessionLogOptions
  ): Promise<void> {
    const { guildId, confession, event, executorId } = options

    try {
      const guildConfig = await SettingRepository.find(guildId)
      if (!guildConfig?.confessionNotificationThreadId) return

      const thread = await container.client.channels.fetch(
        guildConfig.confessionNotificationThreadId
      )
      if (!thread || !('send' in thread)) return

      const preview =
        confession.content.length > 150
          ? `${confession.content.substring(0, 150)}...`
          : confession.content

      const fields: [string, string][] = [
        ['Loại', confession.isAnonymous ? '**Ẩn danh**' : '**Công khai**']
      ]

      if (!confession.isAnonymous) {
        fields.push(['Người gửi', `<@${confession.authorId}>`])
      }

      let logContainer: LoggerBuilder

      if (event === 'SUBMITTED') {
        logContainer = new LoggerBuilder({
          title: `Confession mới \`#${confession.code}\``,
          color: Colors.Yellow
        }).addFields([
          ...fields,
          ['Nội dung', `**${preview}**`],
          [
            'Thời gian',
            `<t:${Math.floor(confession.createdAt.getTime() / 1000)}:R>`
          ]
        ])
      } else if (event === 'APPROVED') {
        logContainer = new LoggerBuilder({
          title: `Duyệt Confession \`#${confession.code}\``,
          color: Colors.Green
        }).addFields([
          ...fields,
          ['Người duyệt', executorId ? `<@${executorId}>` : 'N/A'],
          ['Thời gian duyệt', `<t:${Math.floor(Date.now() / 1000)}:R>`]
        ])
      } else {
        logContainer = new LoggerBuilder({
          title: `Từ chối Confession \`#${confession.code}\``,
          color: Colors.Red
        }).addFields([
          ...fields,
          ['Người từ chối', executorId ? `<@${executorId}>` : 'N/A'],
          ['Thời gian', `<t:${Math.floor(Date.now() / 1000)}:R>`]
        ])
      }

      await MessageUtil.sendToChannel(thread, {
        components: logContainer.build(),
        flags: [MessageFlags.IsComponentsV2]
      })
    } catch (error) {
      container.logger.error(error)
    }
  }
}
