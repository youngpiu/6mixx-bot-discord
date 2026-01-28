import { container } from '@sapphire/pieces'
import { customAlphabet } from 'nanoid'

const generateNanoId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6)

export class DonateRepository {
  private static async generateDonationCode(): Promise<string> {
    let code: string
    let exists = true

    while (exists) {
      code = `DNT${generateNanoId()}`
      const existing = await container.prisma.donation.findUnique({
        where: { code },
        select: { id: true }
      })
      exists = !!existing
    }

    return code!
  }

  private static async getOrCreateDonorCode(guildId: string, donorId: string): Promise<string> {
    const existingDonation = await container.prisma.donation.findFirst({
      where: { guildId, donorId },
      select: { donorCode: true },
      orderBy: { createdAt: 'desc' }
    })

    if (existingDonation?.donorCode) {
      return existingDonation.donorCode
    }

    let donorCode: string
    let exists = true

    while (exists) {
      const randomNum = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0')
      donorCode = `DNR${randomNum}`

      const existing = await container.prisma.donation.findFirst({
        where: { guildId, donorCode },
        select: { id: true }
      })
      exists = !!existing
    }

    return donorCode!
  }

  public static async createDonation(data: {
    guildId: string
    donorId: string
    amount: number
    message?: string
  }) {
    const code = await this.generateDonationCode()
    const donorCode = await this.getOrCreateDonorCode(data.guildId, data.donorId)

    return container.prisma.donation.create({
      data: {
        code,
        donorCode,
        guildId: data.guildId,
        donorId: data.donorId,
        amount: data.amount,
        message: data.message
      }
    })
  }

  public static async findByCode(code: string) {
    return container.prisma.donation.findUnique({
      where: { code }
    })
  }
}
