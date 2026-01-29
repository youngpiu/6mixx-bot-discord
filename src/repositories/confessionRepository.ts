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

  public static async generateConfessionCode(guildId: string): Promise<string> {
    const count = await container.prisma.confession.count({
      where: { guildId }
    })
    const nextNumber = count + 1
    return `CFS${String(nextNumber).padStart(3, '0')}`
  }

  public static async createConfession(data: {
    guildId: string
    authorId: string
    content: string
    isAnonymous: boolean
    attachmentUrls?: string[]
  }) {
    const code = await this.generateConfessionCode(data.guildId)
    return container.prisma.confession.create({
      data: {
        code,
        guildId: data.guildId,
        authorId: data.authorId,
        content: data.content,
        isAnonymous: data.isAnonymous,
        attachmentUrls: data.attachmentUrls ?? []
      }
    })
  }

  public static async getConfessionByCode(code: string) {
    return container.prisma.confession.findUnique({
      where: { code },
      include: { author: true }
    })
  }
}
