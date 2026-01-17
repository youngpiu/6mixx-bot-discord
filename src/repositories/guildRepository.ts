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

  public static async updateTicketConfig(
    guildId: string,
    data: Prisma.TicketConfigUpdateInput
  ) {
    const ticketConfig = await container.prisma.ticketConfig.update({
      where: {
        guildId
      },
      data
    })

    await container.redis.del(`guild:${guildId}:ticket-config`)

    return ticketConfig
  }

  public static async createTicketConfig(
    data: Prisma.TicketConfigUncheckedCreateInput
  ) {
    const ticketConfig = await container.prisma.ticketConfig.create({
      data
    })
    return ticketConfig
  }
}
