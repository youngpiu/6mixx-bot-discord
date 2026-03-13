import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

import { VipSchedulerService } from '../services/VipSchedulerService'

type VipCleanupPayload = {
  userId: string
  guildId: string
}

export class VipCleanupTask extends ScheduledTask {
  public constructor(
    context: ScheduledTask.LoaderContext,
    options: ScheduledTask.Options
  ) {
    super(context, {
      ...options,
      name: 'vipCleanup'
    })
  }

  public async run(payload: VipCleanupPayload) {
    await VipSchedulerService.handleCleanup(payload.guildId, payload.userId)
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    vipCleanup: VipCleanupPayload
  }
}
