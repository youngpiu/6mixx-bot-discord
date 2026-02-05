import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalSubmitInteraction
} from 'discord.js'
import { env } from '~/config/env'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { BadRequestError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'
import { convertSecondToMs } from '~/utils/timeUtil'

import { DonateRepository } from '~/repositories/donateRepository'

const DONATION_AMOUNT = {
  MIN: 1000,
  MAX: 500000
} as const

const DONATION_QR = {
  BASE_URL: 'https://qr.sepay.vn/img'
} as const

export class ModalDonationCreateHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== 'modal-donation-create') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ModalSubmitInteraction>(async (interaction) => {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guildId) return

    const moneyStr = interaction.fields.getTextInputValue('input-donation-amount')
    const amount = this.parseAmount(moneyStr)

    if (isNaN(amount) || amount < DONATION_AMOUNT.MIN || amount > DONATION_AMOUNT.MAX) {
      throw new BadRequestError({
        description: `Bạn thông cảm nha, số tiền quyên góp phải từ **${DONATION_AMOUNT.MIN.toLocaleString('vi-VN')}đ** đến **${DONATION_AMOUNT.MAX.toLocaleString('vi-VN')}đ**.`
      })
    }

    const message = interaction.fields.getTextInputValue('input-donation-message') || undefined

    const donation = await DonateRepository.createDonation({
      guildId: interaction.guildId,
      donorId: interaction.user.id,
      amount,
      message
    })

    const qrUrl = this.buildQrUrl(amount)
    const imageAvailable = await this.isImageAvailable(qrUrl)

    if (!imageAvailable) {
      throw new BadRequestError({
        description: 'Hệ thống hiện tại không thể tạo mã QR, vui lòng thử lại sau.'
      })
    }

    const expiryTime = Math.floor(Date.now() / 1000 + DELETE_REPLY_TIMEOUT.VERY_LONG)

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('💰 Chuyển khoản quyên góp')
      .setDescription('Mã QR bên dưới đã định sẵn số tiền mà bạn vừa nhập.')
      .addFields(
        {
          name: '📋 Hướng dẫn',
          value: lines(
            '• Trước khi chuyển khoản, vui lòng xác nhận đã đọc kỹ các cam kết và lưu ý.',
            '• Sau khi chuyển khoản, bấm nút **Đã chuyển khoản** để xác nhận hoặc **Hủy** để hủy giao dịch.'
          )
        },
        {
          name: '💳 Thông tin giao dịch',
          value: lines(
            `• Mã giao dịch: **#${donation.code}**`,
            `• Số tiền: **${amount.toLocaleString('vi-VN')}đ**`,
            `• Người nhận: ${env.BANK_ACCOUNT_NAME}`,
            `• Số tài khoản: \`${env.BANK_ACCOUNT_NUMBER}\``,
            `• Ngân hàng: ${env.BANK_NAME}`
          )
        }
      )
      .setImage(qrUrl)
      .setFooter({
        text: `Giao dịch sẽ tự động hủy vào ${new Date(expiryTime * 1000).toLocaleTimeString('vi-VN')} nếu không xác nhận`
      })

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn-donation-transferred:${donation.id}`)
        .setLabel('Đã chuyển khoản')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`btn-donation-canceled:${donation.id}`)
        .setLabel('Hủy')
        .setStyle(ButtonStyle.Danger)
    )

    await Promise.all([
      interaction.editReply({
        embeds: [embed],
        components: [actionRow]
      }),
      this.container.tasks.create(
        {
          name: 'cancelDonation',
          payload: { donationId: donation.id }
        },
        convertSecondToMs(DELETE_REPLY_TIMEOUT.VERY_LONG)
      ),
      deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.VERY_LONG)
    ])
  })

  private parseAmount(input: string): number {
    const cleaned = input
      .toLowerCase()
      .replace(/[,.\s]/g, '')
      .replace(/đ$/, '')
      .replace(/vnd$/, '')
      .replace(/k$/, '000')

    return parseInt(cleaned, 10)
  }

  private buildQrUrl(amount: number): string {
    const params = new URLSearchParams({
      acc: env.BANK_ACCOUNT_NUMBER,
      bank: env.BANK_NAME,
      amount: amount.toString(),
      template: 'compact'
    })

    return `${DONATION_QR.BASE_URL}?${params.toString()}`
  }

  private async isImageAvailable(url: string, timeoutMs = 5000): Promise<boolean> {
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
