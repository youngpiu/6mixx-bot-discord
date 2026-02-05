import { container } from '@sapphire/pieces'

import { GuildRepository } from '~/repositories/guildRepository'

export class ConfessionRepository {
  public static async getConfig(guildId: string) {
    return GuildRepository.getConfessionConfig(guildId)
  }

  public static async updateConfig({
    guildId,
    data
  }: {
    guildId: string
    data: {
      notificationForumChannelId?: string
      confessionForumChannelId?: string
      confessionTutorialThreadId?: string
      confessionNotificationThreadId?: string
    }
  }) {
    return GuildRepository.updateConfessionConfig(guildId, data)
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
