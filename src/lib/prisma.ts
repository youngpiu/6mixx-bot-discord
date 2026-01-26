import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '~/config/env'

import { PrismaClient } from '../../generated/prisma/client'

const connectionString = env.DATABASE_URL

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export default prisma
