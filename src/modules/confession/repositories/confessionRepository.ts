import { container } from '@sapphire/pieces'

import type { ConfessionUncheckedCreateInput } from 'generated/prisma/models/Confession'

export class ConfessionRepository {
  private static async generateCode(guildId: string): Promise<string> {
    const count = await container.prisma.confession.count({
      where: { guildId }
    })
    const nextNumber = count + 1
    return `CFS${String(nextNumber).padStart(3, '0')}`
  }

  public static async create(
    data: Omit<ConfessionUncheckedCreateInput, 'code'>
  ) {
    const code = await this.generateCode(data.guildId as string)
    return container.prisma.confession.create({
      data: {
        ...data,
        code,
        attachmentUrls: (data.attachmentUrls as string[] | undefined) ?? []
      }
    })
  }

  public static async findByCode(code: string) {
    return container.prisma.confession.findUnique({
      where: { code },
      include: { author: true }
    })
  }
}
