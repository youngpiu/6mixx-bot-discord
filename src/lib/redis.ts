import Redis from 'ioredis'
import { env } from '~/config/env'

const redis = new Redis(env.REDIS_URL)

redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})

redis.on('ready', () => {
  console.log('Redis connected successfully')
})

redis.on('reconnecting', () => {
  console.log('Redis reconnecting...')
})

export default redis
