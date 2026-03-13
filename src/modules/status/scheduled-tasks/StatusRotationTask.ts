import { ApplyOptions } from '@sapphire/decorators'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import { ActivityType } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'

import { IChartService } from '~/modules/status/services/IChartService'

/**
 * Task that rotates the bot's Discord activity status every 5 seconds.
 * It alternates between displaying the song name and its individual chart rankings.
 */
@ApplyOptions<ScheduledTask.Options>({
  interval: 5000, // 5 seconds
  enabled: true,
  customJobOptions: {
    removeOnComplete: true
  }
})
export class StatusRotationTask extends ScheduledTask {
  /** The current index in the rotation. -1 represents the song name, 0+ represents chart rankings. */
  private currentIndex = -1

  /**
   * Executes the rotation logic.
   * Fetches the latest rankings from cache, determines the next status text based on `currentIndex`,
   * and updates the bot's presence.
   */
  public override async run() {
    const guilds = await SettingRepository.findManyWithIChart()

    const config = guilds[0]
    if (!config) return

    const { ichartSongName, ichartSongId } = config
    let ranks = await IChartService.getLatestRanks(ichartSongId!)

    // Proactive fetch if empty and we have a song ID (e.g., first run or cache expired)
    if (ranks.length === 0 && ichartSongId) {
      ranks = await IChartService.fetchRankings(ichartSongId)
    }

    let statusText = ''

    if (this.currentIndex === -1) {
      statusText = ichartSongName!
    } else {
      const entry = ranks[this.currentIndex]
      if (entry) {
        statusText = IChartService.formatRank(entry)
      } else {
        // Fallback if index is out of bounds
        statusText = ichartSongName!
        this.currentIndex = -1
      }
    }

    this.container.client.user?.setActivity({
      name: statusText,
      type: ActivityType.Custom
    })

    // Increment index and loop back to -1 when reaching the end
    this.currentIndex++
    if (this.currentIndex >= ranks.length) {
      this.currentIndex = -1
    }
  }
}
