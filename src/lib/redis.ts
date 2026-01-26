import { container } from '@sapphire/pieces'
import Redis from 'ioredis'
import { env } from '~/config/env'

const redis = new Redis(env.REDIS_URL)

redis.on('error', (err) => {
  container.logger.error('Redis connection error', err)
})

redis.on('ready', () => {
  container.logger.info('Redis connected successfully')
})

redis.on('reconnecting', () => {
  container.logger.warn('Redis reconnecting...')
})

export default redis
