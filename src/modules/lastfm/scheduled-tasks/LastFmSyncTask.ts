import { ApplyOptions } from '@sapphire/decorators'
import { container } from '@sapphire/pieces'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import { LastFmApiService } from '~/modules/lastfm/services/lastFmApiService'

@ApplyOptions<ScheduledTask.Options>({
  name: 'lastFmSync',
  pattern: '0 4 * * *', // Run daily at 4 AM
  timezone: 'Asia/Ho_Chi_Minh',
  customJobOptions: {
    removeOnComplete: true,
    removeOnFail: true
  }
})
export class LastFmSyncTask extends ScheduledTask {
  public async run() {
    this.container.logger.info(
      '[LastFmSyncTask] Starting daily scrobble sync...'
    )

    try {
      const allAccounts = await container.prisma.lastFmAccount.findMany()
      this.container.logger.info(
        `[LastFmSyncTask] Syncing ${allAccounts.length} accounts.`
      )

      for (const account of allAccounts) {
        try {
          const userInfo = await LastFmApiService.getUserInfo(
            account.lastfmUsername
          )
          if (userInfo?.user) {
            const playcount = parseInt(userInfo.user.playcount, 10)
            await LastFmRepository.updateTotalScrobbles(
              account.userId,
              playcount
            )
          }
          // Sleep a bit to avoid hitting rate limit too hard even with bottleneck
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
          this.container.logger.error(
            `[LastFmSyncTask] Failed to sync ${account.lastfmUsername}:`,
            error
          )
        }
      }

      this.container.logger.info(
        '[LastFmSyncTask] Daily scrobble sync completed.'
      )
    } catch (error) {
      this.container.logger.error(
        '[LastFmSyncTask] Critical error in sync task:',
        error
      )
    }
  }
}
