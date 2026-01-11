import { createClient } from 'redis'
import { env } from '~/config/env'

const redisClient = createClient({
  url: env.REDIS_URL
})

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err)
})

redisClient.on('ready', () => {
  console.log('Redis connected')
})

export { redisClient }
