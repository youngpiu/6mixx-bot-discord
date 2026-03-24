import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

import { env } from '~/shared/config/env'

import { PrismaClient } from '../../generated/prisma/client'

/**
 * Use a pg Pool instead of a bare connection string so that connections are
 * automatically recycled when the server closes them (idle timeout, network
 * hiccup, etc.).  Without a pool, a single terminated connection causes
 * "Connection terminated unexpectedly" and the whole client becomes unusable
 * until the process restarts.
 *
 * @see {@link https://www.prisma.io/docs/orm/overview/databases/postgresql#pgpool Prisma + pg Pool}
 */
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  // Keep a small pool; reconnect idle connections every 30 min to avoid
  // server-side idle timeouts silently terminating them.
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export default prisma
