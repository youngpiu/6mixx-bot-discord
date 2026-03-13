import { ApplyOptions } from '@sapphire/decorators'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

import { IChartService } from '~/modules/status/services/IChartService'

/**
 * Scheduled task that periodically fetches latest iChart rankings for all configured songs.
 * Runs every 30 minutes to keep the Redis cache fresh for all guilds.
 */
@ApplyOptions<ScheduledTask.Options>({
  interval: 30 * 60 * 1000, // 30 minutes
  enabled: true,
  customJobOptions: {
    removeOnComplete: true
  }
})
export class IChartFetchTask extends ScheduledTask {
  /**
   * Executes the task logic.
   * Finds all unique song IDs from guild settings, fetches their current rankings,
   * and updates the Redis cache.
   */
  public override async run() {
    // For now, we fetch for all guilds that have an ichartSongId set.
    // In a real production bot with many guilds, this might need a more optimized approach
    // such as a single global song list or a more efficient queue.
    const guilds = await this.container.prisma.guildSetting.findMany({
      where: {
        ichartSongId: { not: null }
      },
      select: {
        ichartSongId: true
      }
    })

    const songIds = [...new Set(guilds.map((g) => g.ichartSongId!))]

    if (songIds.length === 0) {
      this.container.logger.info('[IChartFetchTask] No song IDs configured.')
      return
    }

    for (const songId of songIds) {
      await IChartService.fetchRankings(songId)
    }

    this.container.logger.info(
      `[IChartFetchTask] Finished fetching data for ${songIds.length} songs.`
    )
  }
}
