import { ApplyOptions } from '@sapphire/decorators'
import { container } from '@sapphire/pieces'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

import { LastFmRepository } from '~/modules/lastfm/repositories/lastFmRepository'
import { LastFmApiService } from '~/modules/lastfm/services/lastFmApiService'

/**
 * Background sync task that pre-fetches top artists for all Last.fm accounts
 * and stores them in the LastFmUserArtistLibrary table.
 * This enables near-instant responses for /fm whoknows artist.
 *
 * Schedule: Every 6 hours.
 */
@ApplyOptions<ScheduledTask.Options>({
  name: 'lastFmLibrarySync',
  pattern: '0 */6 * * *', // Every 6 hours
  timezone: 'Asia/Ho_Chi_Minh',
  customJobOptions: {
    removeOnComplete: true,
    removeOnFail: true
  }
})
export class LastFmLibrarySyncTask extends ScheduledTask {
  private static readonly BATCH_SIZE = 3 // Process 3 accounts at a time
  private static readonly BATCH_DELAY = 1000 // 1 second between batches
  private static readonly TOP_ARTISTS_LIMIT = 500 // per user

  public async run() {
    container.logger.info('[LastFmLibrarySync] Starting artist library sync...')

    try {
      const allAccounts = await container.prisma.lastFmAccount.findMany()
      container.logger.info(
        `[LastFmLibrarySync] Syncing library for ${allAccounts.length} accounts.`
      )

      let syncedCount = 0
      let errorCount = 0

      // Process in small batches to avoid overwhelming Last.fm API
      for (
        let i = 0;
        i < allAccounts.length;
        i += LastFmLibrarySyncTask.BATCH_SIZE
      ) {
        const batch = allAccounts.slice(i, i + LastFmLibrarySyncTask.BATCH_SIZE)

        await Promise.all(
          batch.map(async (account) => {
            try {
              // Fetch top 500 artists (all time) for this user
              const data = await LastFmApiService.getUserTopArtists(
                account.lastfmUsername,
                'overall',
                LastFmLibrarySyncTask.TOP_ARTISTS_LIMIT
              )

              const artists = data.topartists?.artist ?? []

              // Upsert all artists to the library table
              await Promise.all(
                artists.map(
                  (artist) =>
                    LastFmRepository.upsertUserArtistLibrary(
                      account.userId,
                      artist.name,
                      parseInt(artist.playcount, 10)
                    ).catch(() => null) // Ignore individual failures
                )
              )

              syncedCount++
            } catch (error) {
              errorCount++
              container.logger.error(
                `[LastFmLibrarySync] Failed to sync ${account.lastfmUsername}:`,
                error
              )
            }
          })
        )

        // Throttle between batches
        if (i + LastFmLibrarySyncTask.BATCH_SIZE < allAccounts.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, LastFmLibrarySyncTask.BATCH_DELAY)
          )
        }
      }

      container.logger.info(
        `[LastFmLibrarySync] Completed. Synced: ${syncedCount}, Errors: ${errorCount}.`
      )
    } catch (error) {
      container.logger.error(
        '[LastFmLibrarySync] Critical error in sync task:',
        error
      )
    }
  }
}
