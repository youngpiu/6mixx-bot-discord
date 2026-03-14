import '@sapphire/pieces'
import '@sapphire/plugin-scheduled-tasks'
import type Redis from 'ioredis'

import prisma from '~/lib/prisma'

// Augments the Sapphire container to include shared resources for global access
declare module '@sapphire/pieces' {
  interface Container {
    prisma: typeof prisma
    redis: Redis
  }
}
declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    lastFmChart: import('~/modules/lastfm/scheduled-tasks/LastFmChartTask').ChartTaskPayload
    lastFmSync: never // No payload
  }
}
