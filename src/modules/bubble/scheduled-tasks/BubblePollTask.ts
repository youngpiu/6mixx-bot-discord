import { ApplyOptions } from '@sapphire/decorators'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

import { env } from '~/shared/config/env'

import { BubbleService } from '~/modules/bubble/services/BubbleService'

@ApplyOptions<ScheduledTask.Options>({
  interval: BubbleService.getPollIntervalMs(),
  enabled: env.BUBBLE_AUTO_ENABLED,
  customJobOptions: {
    removeOnComplete: true,
    removeOnFail: true
  }
})
export class BubblePollTask extends ScheduledTask {
  public override async run() {
    await BubbleService.pollAndNotify()
  }
}
