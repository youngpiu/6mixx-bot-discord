import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'

export class RemoveDonationTask extends ScheduledTask {
  public constructor(
    context: ScheduledTask.LoaderContext,
    options: ScheduledTask.Options
  ) {
    super(context, {
      ...options,
      name: 'removeDonation',
      pattern: '0 0 * * *', // Run daily at midnight
      timezone: 'Asia/Ho_Chi_Minh',
      customJobOptions: {
        removeOnComplete: true,
        removeOnFail: true
      }
    })
  }

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
