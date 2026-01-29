import { container } from '@sapphire/pieces'

interface UpsertConfessionConfigInput {
  guildId: string
  data: {
    notificationChannelId: string
    forumChannelId: string
    tutorialThreadId?: string
  }
}

export class ConfessionRepository {
  public static async getConfig(guildId: string) {
    return container.prisma.confessionConfig.findUnique({
      where: { guildId }
    })
  }

  public static async upsertConfig({ guildId, data }: UpsertConfessionConfigInput) {
    return container.prisma.confessionConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        ...data
      },
      update: data
    })
  }
}
