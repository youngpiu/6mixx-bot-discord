import '@sapphire/framework'
import type { TaskStore } from '@sapphire/plugin-scheduled-tasks'
import type Redis from 'ioredis'

import prisma from '~/lib/prisma'

declare module '@sapphire/framework' {
  interface Container {
    prisma: typeof prisma
    redis: Redis
    tasks: TaskStore
  }
}
