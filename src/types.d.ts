import '@sapphire/framework'
import type { TaskStore } from '@sapphire/plugin-scheduled-tasks'
import type Redis from 'ioredis'

import prisma from '~/lib/prisma'

// Augments the Sapphire container to include shared resources for global access
declare module '@sapphire/framework' {
  interface Container {
    prisma: typeof prisma
    redis: Redis
    tasks: TaskStore
  }
}
