import { container } from '@sapphire/pieces'

import { Prisma } from 'generated/prisma/client'
import { ConfessionStatus } from 'generated/prisma/enums'
import type { ConfessionUncheckedCreateInput } from 'generated/prisma/models/Confession'

import { TIME } from '~/shared/constants/timeConstant'
import { CounterRepository } from '~/shared/repositories/counterRepository'
import { CacheService } from '~/shared/services/cacheService'

export class ConfessionRepository {
  private static async generateCode(guildId: string): Promise<string> {
    return CounterRepository.generateCode(guildId, 'CONFESSION_ALL', 'CFS')
  }

  public static async invalidateConfessionCache(guildId: string) {
    await CacheService.invalidatePattern(`confessions:${guildId}:*`)
  }

  public static async create(
    data: Omit<ConfessionUncheckedCreateInput, 'code'>
  ) {
    const code = await this.generateCode(data.guildId as string)
    const confession = await container.prisma.confession.create({
      data: {
        ...data,
        code
      }
    })

    await this.invalidateConfessionCache(data.guildId as string)
    return confession
  }

  public static async update(
    id: string,
    data: Prisma.ConfessionUncheckedUpdateInput
  ) {
    const confession = await container.prisma.confession.update({
      where: { id },
      data
    })

    await this.invalidateConfessionCache(confession.guildId)
    return confession
  }

  public static async findByCode(code: string) {
    return container.prisma.confession.findUnique({
      where: { code },
      include: { author: true }
    })
  }

  public static async findById(id: string) {
    return container.prisma.confession.findUnique({
      where: { id },
      include: { author: true }
    })
  }

  public static async searchByCode(guildId: string, query: string, limit = 25) {
    return container.prisma.confession.findMany({
      where: {
        guildId,
        code: {
          contains: query,
          mode: 'insensitive'
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  }

  public static async findMany({
    guildId,
    page = 1,
    limit = 5,
    status
  }: {
    guildId: string
    page?: number
    limit?: number
    status?: ConfessionStatus
  }) {
    const cacheKey = `confessions:${guildId}:${page}:${limit}:${status || '*'}`

    const cached = await CacheService.remember(cacheKey, TIME.S30, async () => {
      const skip = (page - 1) * limit
      const [confessions, total] = await Promise.all([
        container.prisma.confession.findMany({
          where: {
            guildId,
            ...(status ? { status } : {})
          },
          include: { author: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        container.prisma.confession.count({
          where: {
            guildId,
            ...(status ? { status } : {})
          }
        })
      ])
      return { confessions, total }
    })

    // Reconstruct Date objects from cached JSON string
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      confessions: cached.confessions.map((cfs: any) => ({
        ...cfs,
        createdAt: new Date(cfs.createdAt),
        updatedAt: new Date(cfs.updatedAt)
      })),
      total: cached.total
    }
  }
}
