// Scheduled task to clean up old pending/canceled donations
import { ApplyOptions } from '@sapphire/decorators'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

import { DonateRepository } from '~/modules/donation/repositories/donateRepository'

@ApplyOptions<ScheduledTask.Options>({
  name: 'removeDonation',
  pattern: '0 0 * * *', // Run daily at midnight
  timezone: 'Asia/Ho_Chi_Minh',
  customJobOptions: {
    removeOnComplete: true,
    removeOnFail: true
  }
})
export class RemoveDonationTask extends ScheduledTask {
  public async run() {
    this.container.logger.info(
      'Running daily cleanup of old pending/canceled donations...'
    )
    try {
      const result = await DonateRepository.deleteOld(3)

      this.container.logger.info(
        `Successfully deleted ${result.count} old pending/canceled donations.`
      )
    } catch (error) {
      this.container.logger.error(
        'Failed to clean up expired donations:',
        error
      )
    }
  }
}
