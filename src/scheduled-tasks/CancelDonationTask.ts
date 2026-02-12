import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

import { DonateRepository } from '~/repositories/donateRepository'

type CancelDonationPayload = {
  donationId: string
}

export class CancelDonationTask extends ScheduledTask {
  public constructor(context: ScheduledTask.LoaderContext, options: ScheduledTask.Options) {
    super(context, {
      ...options,
      name: 'cancelDonation'
    })
  }

  public async run(payload: CancelDonationPayload) {
    try {
      await DonateRepository.cancelDonation(payload.donationId)
    } catch (error) {
      this.container.logger.error(`Skip cancel for ${payload.donationId}:`, error)
    }
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    cancelDonation: CancelDonationPayload
  }
}
