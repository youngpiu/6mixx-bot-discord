import '@sapphire/framework'
import type { PrismaClient } from '../../generated/prisma/client'
import type Redis from 'ioredis'

declare module '@sapphire/framework' {
  interface Container {
    prisma: PrismaClient
    redis: Redis
  }
}

declare global {
  type ErrorContext = {
    title: string
    description: string
  }
}
