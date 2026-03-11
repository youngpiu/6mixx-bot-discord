import { container } from '@sapphire/pieces'

export class GuildRepository {
  public static async upsert(guildId: string) {
    return container.prisma.guild.upsert({
      where: { id: guildId },
      create: { id: guildId },
      update: {}
    })
  }
}
