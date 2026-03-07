import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalSubmitInteraction } from 'discord.js'
import { DONATION_CONFIG } from '~/config/donation'
import { env } from '~/config/env'

import { CUSTOM_ID } from '~/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

import { DonationHelper } from '~/helpers/DonationHelper'
import { lines } from '~/utils/textUtil'

import { DonateRepository } from '~/repositories/donateRepository'

export class ModalDonationCreateHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_DONATION_CREATE) return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction.guildId) return

    const moneyStr = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT_DONATION_AMOUNT)
    const amount = this.parseAmount(moneyStr)

    const { MIN, MAX } = DONATION_CONFIG.AMOUNT

    if (isNaN(amount) || amount < MIN || amount > MAX) {
      throw new NormalError(
        `Bạn thông cảm nha, số tiền quyên góp phải từ **${MIN.toLocaleString('vi-VN')}đ** đến **${MAX.toLocaleString('vi-VN')}đ**.`
      )
    }

    const message =
      interaction.fields.getTextInputValue(CUSTOM_ID.INPUT_DONATION_MESSAGE) || undefined

    const donation = await DonateRepository.createDonation({
      guildId: interaction.guildId,
      donorId: interaction.user.id,
      amount,
      message
    })

    const qrUrl = this.buildQrUrl(amount, donation.code)
    const imageAvailable = await this.isImageAvailable(qrUrl)

    if (!imageAvailable) {
      throw new NormalError('Hệ thống hiện tại không thể tạo mã QR, vui lòng thử lại sau.')
    }

    const expiryTime = Math.floor(Date.now() / 1000 + DONATION_CONFIG.TIMEOUT.PAYMENT_WAIT / 1000)

    const embed = {
      title: `CHUYỂN KHOẢN QUYÊN GÓP`,
      description: '-# Mã QR bên dưới đã định sẵn số tiền mà bạn vừa nhập.',
      fields: [
        {
          name: `Lưu ý`,
          value: lines(
            `▶️ Trước khi chuyển khoản, vui lòng xác nhận đã đọc kỹ các cam kết và lưu ý.`,
            `▶️ Sau khi chuyển khoản, bấm nút **Đã chuyển khoản** để xác nhận.`,
            `▶️ Nếu không chuyển khoản, vui lòng bấm nút **Hủy** để hủy giao dịch.`
          ),
          inline: false
        },
        {
          name: `Thông tin giao dịch`,
          value: lines(
            `▶️ **Mã giao dịch:** \`#${donation.code}\``,
            `▶️ **Số tiền:** ${amount.toLocaleString('vi-VN')}đ`,
            `▶️ **Người nhận:** ${env.BANK_ACCOUNT_NAME}`,
            `▶️ **Số tài khoản:** \`${env.BANK_ACCOUNT_NUMBER}\``,
            `▶️ **Ngân hàng:** ${env.BANK_NAME}`
          ),
          inline: false
        }
      ],
      image: { url: qrUrl },
      footer: {
        text: `Giao dịch sẽ tự động hủy sau 10 phút nữa, vào lúc ${new Date(expiryTime * 1000).toLocaleTimeString('vi-VN', { hour12: true })} nếu bạn không xác nhận.`
      }
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_ID.BTN_DONATION_DONOR_CONFIRMED_PREFIX}${donation.id}`)
        .setLabel('Đã chuyển khoản')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_ID.BTN_DONATION_DONOR_CANCELED_PREFIX}${donation.id}`)
        .setLabel('Hủy')
        .setStyle(ButtonStyle.Danger)
    )

    await Promise.all([
      interaction.editReply({
        embeds: [embed],
        components: [row]
      }),
      this.container.tasks.create(
        {
          name: 'cancelDonation',
          payload: { donationId: donation.id, guildId: interaction.guildId }
        },
        DONATION_CONFIG.TIMEOUT.PAYMENT_WAIT
      ),
      DonationHelper.sendDonationNotification({
        guildId: interaction.guildId!,
        donation,
        event: 'CREATED'
      })
    ])
  }

  private parseAmount(input: string): number {
    const cleaned = input
      .toLowerCase()
      .replace(/[,.\s]/g, '')
      .replace(/đ$/, '')
      .replace(/vnd$/, '')
      .replace(/k$/, '000')

    return parseInt(cleaned, 10)
  }

  private buildQrUrl(amount: number, donationCode: string): string {
    const params = new URLSearchParams({
      acc: env.BANK_ACCOUNT_NUMBER,
      bank: env.BANK_NAME,
      amount: amount.toString(),
      template: 'compact',
      des: donationCode
    })

    return `${DONATION_CONFIG.QR.BASE_URL}?${params.toString()}`
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
