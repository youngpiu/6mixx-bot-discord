import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { env } from '~/config/env'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { BadRequestError } from '~/core/errorResponse'

import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { DonateRepository } from '~/repositories/donateRepository'

const DONATION_AMOUNT = {
  MIN: 1000,
  MAX: 1000000
} as const

const DONATION_QR = {
  BASE_URL: 'https://qr.sepay.vn/img'
} as const

export class DonateHandler {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) {
      throw new BadRequestError({
        description: ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
      })
    }

    const moneyStr = interaction.options.getString('money', true)

    const amount = this.parseAmount(moneyStr)

    if (isNaN(amount) || amount < DONATION_AMOUNT.MIN || amount > DONATION_AMOUNT.MAX) {
      throw new BadRequestError({
        description: `Số tiền quyên góp phải từ **${DONATION_AMOUNT.MIN.toLocaleString('vi-VN')}đ** đến **${DONATION_AMOUNT.MAX.toLocaleString('vi-VN')}đ**.`
      })
    }

    const message = interaction.options.getString('message', false)

    const donation = await DonateRepository.createDonation({
      guildId: interaction.guildId,
      donorId: interaction.user.id,
      amount,
      message: message ?? undefined
    })

    const qrUrl = this.buildQrUrl(amount, donation.code)

    const imageAvailable = await this.isImageAvailable(qrUrl)

    if (!imageAvailable) {
      throw new BadRequestError({
        description: 'Hệ thống hiện tại không thể tạo mã QR, vui lòng thử lại sau.'
      })
    }

    const embed = new EmbedBuilder()
      .setColor('LuminousVividPink')
      .setTitle('Quyên góp ủng hộ')
      .setDescription(
        [
          'Vui lòng dành ít phút để đọc kỹ các thông tin dưới đây trước khi thực hiện quyên góp:',
          '- Khoản quyên góp được sử dụng cho chi phí thuê máy chủ và các hạng mục cần thiết phục vụ cho hoạt động của BOT.',
          '- Không sử dụng khoản tiền này cho mục đích cá nhân hoặc các dịch vụ không liên quan đến BOT.',
          '- Thông tin chuyển khoản được tiếp nhận theo hình thức ẩn danh và không hiển thị công khai trong máy chủ.',
          '- Việc quyên góp không tạo ra bất kỳ hình thức ưu tiên, đặc quyền hoặc miễn trừ nào khi xử lý vi phạm nội quy máy chủ **VNMIXX**.'
        ].join('\n')
      )
      .addFields({
        name: 'Mã giao dịch',
        value: `*#${donation.code}*`
      })
      .addFields({
        name: 'Mã người chuyển',
        value: `*#${donation.donorCode}*`
      })
      .addFields({
        name: 'Số tiền',
        value: `${amount.toLocaleString('vi-VN')}đ`
      })
      .setImage(qrUrl)

    if (message) {
      embed.addFields({
        name: 'Lời nhắn',
        value: message
      })
    }

    await interaction.editReply({ embeds: [embed] })
    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.VERY_LONG)
  }

  private static parseAmount(input: string): number {
    const cleaned = input
      .toLowerCase()
      .replace(/[,.\s]/g, '')
      .replace(/đ$/, '')
      .replace(/vnd$/, '')
      .replace(/k$/, '000')

    return parseInt(cleaned, 10)
  }

  private static buildQrUrl(amount: number, code: string): string {
    const params = new URLSearchParams({
      acc: env.BANK_ACCOUNT_NUMBER,
      bank: env.BANK_NAME,
      amount: amount.toString(),
      des: code
    })

    return `${DONATION_QR.BASE_URL}?${params.toString()}`
  }

  private static async isImageAvailable(url: string, timeoutMs = 5000): Promise<boolean> {
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(timeoutMs)
      })

      return res.ok && res.headers.get('content-type')?.startsWith('image/') === true
    } catch {
      return false
    }
  }
}
