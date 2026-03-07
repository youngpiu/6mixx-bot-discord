import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

import { DonationHelper } from '~/helpers/DonationHelper'

import { DonateRepository } from '~/repositories/donateRepository'

type CancelDonationPayload = {
  donationId: string
  guildId: string
}

export class CancelDonationTask extends ScheduledTask {
  public constructor(context: ScheduledTask.LoaderContext, options: ScheduledTask.Options) {
    super(context, {
      ...options,
      name: 'cancelDonation'
    })
  }

  public async run(payload: CancelDonationPayload) {
    // Retrieve donation to access guildId for error handling
    const donation = await DonateRepository.findById(payload.donationId)

    if (!donation) {
      this.container.logger.warn(`Donation ${payload.donationId} not found, skipping auto-cancel`)
      return
    }

    if (donation.status !== 'PENDING') {
      this.container.logger.info(
        `Donation ${payload.donationId} already ${donation.status}, skipping auto-cancel`
      )
      return
    }

    await DonateRepository.cancelDonation(payload.donationId)

    // Send auto-cancellation notification
    await DonationHelper.sendDonationNotification({
      guildId: donation.guildId,
      donation,
      event: 'AUTO_CANCELED'
    })

    this.container.logger.info(`Auto-canceled donation ${payload.donationId}`)
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    cancelDonation: CancelDonationPayload
  }
}
