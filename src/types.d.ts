import '@sapphire/framework'
import type Redis from 'ioredis'

import prisma from '~/lib/prisma'

declare module '@sapphire/framework' {
  interface Container {
    prisma: typeof prisma
    redis: Redis
  }
}

declare global {
  type ErrorContext = {
    title: string
    description: string
  }
}
