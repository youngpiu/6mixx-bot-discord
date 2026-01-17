import { container } from '@sapphire/pieces'
import { Prisma } from 'generated/prisma/client'

export class GuildRepository {
  private static CACHE_CONFIG_TTL = 60 * 10 // 10 phút

  public static async getTicketConfig(guildId: string) {
    const cacheKey = `guild:${guildId}:ticket-config`
    const cached = await container.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const ticketConfig = await container.prisma.ticketConfig.findUnique({
      where: {
        guildId
      }
    })
    if (!ticketConfig) return null

    await container.redis.set(
      cacheKey,
      JSON.stringify(ticketConfig),
      'EX',
      this.CACHE_CONFIG_TTL
    )
    return ticketConfig
  }

  public static async upsertTicketConfig(
    guildId: string,
    data: Omit<Prisma.TicketConfigUncheckedCreateInput, 'guildId'>
  ) {
    const ticketConfig = await container.prisma.ticketConfig.upsert({
      where: { guildId },
      update: data,
      create: { guildId, ...data }
    })

    await container.redis.del(`guild:${guildId}:ticket-config`)

    return ticketConfig
  }
}
