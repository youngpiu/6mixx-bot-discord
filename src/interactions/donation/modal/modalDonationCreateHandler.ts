import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalSubmitInteraction } from 'discord.js'
import { DONATION_CONFIG } from '~/config/donation'
import { env } from '~/config/env'

import { ANIMATED_EMOJI } from '~/constants/iconConstant'
import { BadRequestError } from '~/core/errorResponse'

import { DonationHelper } from '~/helpers/DonationHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'
import { convertSecondToMs } from '~/utils/timeUtil'

import { DonateRepository } from '~/repositories/donateRepository'

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
    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction.guildId) return

    const moneyStr = interaction.fields.getTextInputValue('input-donation-amount')
    const amount = this.parseAmount(moneyStr)

    const { MIN, MAX } = DONATION_CONFIG.AMOUNT

    if (isNaN(amount) || amount < MIN || amount > MAX) {
      throw new BadRequestError({
        description: `Bạn thông cảm nha, số tiền quyên góp phải từ **${MIN.toLocaleString('vi-VN')}đ** đến **${MAX.toLocaleString('vi-VN')}đ**.`
      })
    }

    const message = interaction.fields.getTextInputValue('input-donation-message') || undefined

    const donation = await DonateRepository.createDonation({
      guildId: interaction.guildId,
      donorId: interaction.user.id,
      amount,
      message
    })

    const qrUrl = this.buildQrUrl(amount, donation.code)
    const imageAvailable = await this.isImageAvailable(qrUrl)

    if (!imageAvailable) {
      throw new BadRequestError({
        description: 'Hệ thống hiện tại không thể tạo mã QR, vui lòng thử lại sau.'
      })
    }

    const expiryTime = Math.floor(Date.now() / 1000 + DONATION_CONFIG.TIMEOUT.PAYMENT_WAIT)

    const embed = {
      title: `${ANIMATED_EMOJI.WING_LEFT} CHUYỂN KHOẢN QUYÊN GÓP ${ANIMATED_EMOJI.WING_RIGHT}`,
      description: '-# Mã QR bên dưới đã định sẵn số tiền mà bạn vừa nhập.',
      fields: [
        {
          name: `${ANIMATED_EMOJI.HEART_RIGHT} Lưu ý`,
          value: lines(
            `${ANIMATED_EMOJI.ARROW_RIGHT} Trước khi chuyển khoản, vui lòng xác nhận đã đọc kỹ các cam kết và lưu ý.`,
            `${ANIMATED_EMOJI.ARROW_RIGHT} Sau khi chuyển khoản, bấm nút **Đã chuyển khoản** để xác nhận.`,
            `${ANIMATED_EMOJI.ARROW_RIGHT} Nếu không chuyển khoản, vui lòng bấm nút **Hủy** để hủy giao dịch.`
          ),
          inline: false
        },
        {
          name: `${ANIMATED_EMOJI.HEART_RIGHT} Thông tin giao dịch`,
          value: lines(
            `${ANIMATED_EMOJI.ARROW_RIGHT} **Mã giao dịch:** \`#${donation.code}\``,
            `${ANIMATED_EMOJI.ARROW_RIGHT} **Số tiền:** ${amount.toLocaleString('vi-VN')}đ`,
            `${ANIMATED_EMOJI.ARROW_RIGHT} **Người nhận:** ${env.BANK_ACCOUNT_NAME}`,
            `${ANIMATED_EMOJI.ARROW_RIGHT} **Số tài khoản:** \`${env.BANK_ACCOUNT_NUMBER}\``,
            `${ANIMATED_EMOJI.ARROW_RIGHT} **Ngân hàng:** ${env.BANK_NAME}`
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
        .setCustomId(`btn-donation-donor-confirmed:${donation.id}`)
        .setLabel('Đã chuyển khoản')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`btn-donation-donor-canceled:${donation.id}`)
        .setLabel('Hủy')
        .setStyle(ButtonStyle.Danger)
    )

    // Send donation creation notification
    const sendNotification = async () => {
      await DonationHelper.sendDonationNotification({
        guildId: interaction.guildId!,
        donation,
        event: 'CREATED'
      })
    }

    await Promise.all([
      interaction.editReply({
        embeds: [embed],
        components: [row]
      }),
      this.container.tasks.create(
        {
          name: 'cancelDonation',
          payload: { donationId: donation.id }
        },
        convertSecondToMs(DONATION_CONFIG.TIMEOUT.PAYMENT_WAIT)
      ),
      deleteReplyInteraction(interaction, DONATION_CONFIG.TIMEOUT.PAYMENT_WAIT),
      sendNotification()
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
