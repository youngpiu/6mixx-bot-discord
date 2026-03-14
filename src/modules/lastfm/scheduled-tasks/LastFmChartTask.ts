import { ApplyOptions } from '@sapphire/decorators'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import { AttachmentBuilder, WebhookClient } from 'discord.js'

import { LastFmImageService } from '~/modules/lastfm/services/lastFmImageService'

export interface ChartTaskPayload {
  items: { url: string; title: string; subtitle?: string; stats?: string }[]
  size: number
  interactionToken: string
  applicationId: string
  content?: string
}

@ApplyOptions<ScheduledTask.Options>({
  name: 'lastFmChart'
})
export class LastFmChartTask extends ScheduledTask {
  public async run(payload: ChartTaskPayload) {
    const { items, size, interactionToken, applicationId, content } = payload

    try {
      this.container.logger.info(
        `[LastFmChartTask] Rendering ${size}x${size} chart...`
      )

      const buffer = await LastFmImageService.renderChart(items, size, size)
      const attachment = new AttachmentBuilder(buffer, { name: 'chart.jpg' })

      // Edit the deferred interaction using webhook
      const webhook = new WebhookClient({
        id: applicationId,
        token: interactionToken
      })

      await webhook.editMessage('@original', {
        content: content || null,
        files: [attachment]
      })

      this.container.logger.info(`[LastFmChartTask] Chart rendered and sent.`)
    } catch (error) {
      this.container.logger.error(
        '[LastFmChartTask] Failed to render chart:',
        error
      )

      try {
        const webhook = new WebhookClient({
          id: applicationId,
          token: interactionToken
        })
        await webhook.editMessage('@original', {
          content:
            '❌ Đã có lỗi xảy ra trong quá trình tạo chart. Vui lòng thử lại sau.'
        })
      } catch (e) {
        this.container.logger.error(
          '[LastFmChartTask] Failed to send error message:',
          e
        )
      }
    }
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    lastFmChart: ChartTaskPayload
  }
}
