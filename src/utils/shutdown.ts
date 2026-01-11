import redis from '~/lib/redis'
import prisma from '~/lib/prisma'

let isShuttingDown = false

export async function gracefulShutdown(client?: { destroy: () => void }) {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log('\nShutting down gracefully...')

  // Destroy Discord client
  if (client) {
    client.destroy()
    console.log('Discord client destroyed')
  }

  // Close Redis (ioredis)
  redis.disconnect()
  console.log('Redis connection closed')

  // Disconnect Prisma
  await prisma.$disconnect()
  console.log('Prisma disconnected')

  process.exit(0)
}
