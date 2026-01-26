import { container } from '@sapphire/pieces'

import prisma from '~/lib/prisma'
import redis from '~/lib/redis'

let isShuttingDown = false

export async function gracefulShutdown(client?: { destroy: () => void }) {
  if (isShuttingDown) return
  isShuttingDown = true

  container.logger.info('Shutting down gracefully...')

  if (client) {
    client.destroy()
    container.logger.info('Discord client destroyed')
  }

  redis.disconnect()
  container.logger.info('Redis connection closed')

  await prisma.$disconnect()
  container.logger.info('Prisma disconnected')

  process.exit(0)
}
