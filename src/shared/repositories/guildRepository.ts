import { container } from '@sapphire/pieces'

export class GuildRepository {
  public static async upsert(guildId: string) {
    return container.prisma.guild.upsert({
      where: { guildId },
      create: { guildId },
      update: {}
    })
  }
}
