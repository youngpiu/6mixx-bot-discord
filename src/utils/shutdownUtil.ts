import redis from '~/lib/redis'
import prisma from '~/lib/prisma'
import { container } from '@sapphire/framework'

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
