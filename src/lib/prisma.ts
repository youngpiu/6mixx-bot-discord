import { PrismaPg } from '@prisma/adapter-pg'

import { env } from '~/shared/config/env'

import { PrismaClient } from '../../generated/prisma/client'

const connectionString = env.DATABASE_URL

/**
 * The initialized Prisma client instance using the PostgreSQL adapter.
 * Provides type-safe database access throughout the application.
 *
 * @see {@link https://www.prisma.io/docs/concepts/components/prisma-client Prisma Client Documentation}
 */
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export default prisma
