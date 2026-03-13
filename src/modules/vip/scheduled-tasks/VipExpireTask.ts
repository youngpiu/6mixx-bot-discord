import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

import { VipSchedulerService } from '../services/VipSchedulerService'

type VipExpirePayload = {
  userId: string
  guildId: string
}

export class VipExpireTask extends ScheduledTask {
  public constructor(
    context: ScheduledTask.LoaderContext,
    options: ScheduledTask.Options
  ) {
    super(context, {
      ...options,
      name: 'vipExpire'
    })
  }

  public async run(payload: VipExpirePayload) {
    await VipSchedulerService.handleExpiration(payload.guildId, payload.userId)
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    vipExpire: VipExpirePayload
  }
}
