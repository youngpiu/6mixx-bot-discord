import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  ModalSubmitInteraction
} from 'discord.js'
import { DonationHelper } from '~/modules/donation/helpers/DonationHelper'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'
import { env } from '~/shared/config/env'
import { ANIMATED_EMOJI, STATIC_EMOJI } from '~/shared/constants/emojiConstant'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { TIME } from '~/shared/constants/timeConstant'
import { createTextContainer } from '~/shared/utils/messageUtil'
import { lines } from '~/shared/utils/textUtil'

import { NormalError } from '~/core/errorResponse'

export class ModalDonationCreate extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_DONATION_CREATE)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: 'Ephemeral' })

    if (!interaction || !interaction.guild) return

    const moneyStr = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_DONATION_AMOUNT
    )
    const amount = this.parseAmount(moneyStr)

    const MIN = 1000
    const MAX = 500000

    if (isNaN(amount) || amount < MIN || amount > MAX) {
      throw new NormalError(
        `Bạn thông cảm nha, số tiền quyên góp phải từ **${MIN.toLocaleString('vi-VN')}đ** đến **${MAX.toLocaleString('vi-VN')}đ**.`
      )
    }

    const message =
      interaction.fields.getTextInputValue(CUSTOM_ID.INPUT_DONATION_MESSAGE) ||
      undefined

    const donation = await DonateRepository.create({
      guildId: interaction.guild.id,
      donorId: interaction.user.id,
      amount,
      message
    })

    if (!donation) {
      throw new NormalError(
        'Không thể tạo giao dịch quyên góp, vui lòng thử lại.'
      )
    }

    const qrUrl = this.buildQrUrl(amount, donation.code)
    const imageAvailable = await this.isImageAvailable(qrUrl)

    if (!imageAvailable) {
      throw new NormalError(
        'Hệ thống hiện tại không thể tạo mã QR, vui lòng thử lại sau.'
      )
    }

    const expiryTime = Math.floor(Date.now() / 1000 + 600000 / 1000)

    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          lines(
            `### ${ANIMATED_EMOJI.WING_LEFT} CHUYỂN KHOẢN QUYÊN GÓP ${ANIMATED_EMOJI.WING_RIGHT}`,
            `-# Vui lòng quét mã QR bên dưới để thực hiện chuyển khoản quyên góp.`
          )
        )
      )
      .addSeparatorComponents((s) => s)
      .addTextDisplayComponents((t) =>
        t.setContent(
          lines(
            `- **Lưu ý:**`,
            `  - Hãy đọc kỹ các **cam kết** và **lưu ý** trớc khi thực hiện chuyển khoản.`,
            `  - **Sau khi chuyển khoản**, vui lòng bấm nút **Đã chuyển khoản** để xác nhận.`,
            `  - **Nếu không chuyển khoản**, vui lòng bấm nút **Hủy** để hủy giao dịch.`,
            '',
            `- Thông tin giao dịch`,
            `  - **Mã giao dịch:** \`#${donation.code}\``,
            `  - **Số tiền:** ${amount.toLocaleString('vi-VN')}đ`,
            `  - **Người nhận:** ${env.BANK_ACCOUNT_NAME}`,
            `  - **Số tài khoản:** \`${env.BANK_ACCOUNT_NUMBER}\``,
            `  - **Ngân hàng:** ${env.BANK_NAME}`
          )
        )
      )
      .addSeparatorComponents((s) => s.setSpacing(2))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems((item) => item.setURL(qrUrl))
      )
      .addSeparatorComponents((s) => s.setSpacing(2))
      .addTextDisplayComponents((text) =>
        text.setContent(
          `-# Giao dịch sẽ tự động hủy sau 10 phút nữa, vào lúc ${new Date(expiryTime * 1000).toLocaleTimeString('vi-VN', { hour12: true })} nếu bạn không xác nhận.`
        )
      )
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(
              `${CUSTOM_ID.BTN_DONATION_DONOR_CONFIRMED_PREFIX}${donation.id}`
            )
            .setLabel('Đã chuyển khoản')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(
              `${CUSTOM_ID.BTN_DONATION_DONOR_CANCELED_PREFIX}${donation.id}`
            )
            .setLabel('Hủy')
            .setStyle(ButtonStyle.Danger)
        )
      )

    await Promise.all([
      interaction.editReply({
        components: [container],
        flags: ['IsComponentsV2']
      }),
      DonationHelper.sendDonationNotification({
        guildId: interaction.guild.id,
        donation,
        event: 'CREATED'
      })
    ])

    setTimeout(async () => {
      try {
        await interaction.editReply({
          components: [
            createTextContainer(
              `${STATIC_EMOJI.RATE_LIMIT_ERROR} Giao dịch của bạn đã bị huỷ tự động do hết thời gian (10 phút).`
            )
          ],
          flags: ['IsComponentsV2']
        })
      } catch (error) {
        this.container.logger.error(error)
      }
    }, TIME.M10)
  }

  private parseAmount(input: string): number {
    const cleaned = input
      .toLowerCase()
      .replace(/[,.\s]/g, '')
      .replace(/đ$/, '')
      .replace(/vnd$/, '')
      .replace(/k$/, '000')

    if (!/^\d+$/.test(cleaned)) return NaN

    return parseInt(cleaned, 10)
  }

  private buildQrUrl(amount: number, donationCode: string): string {
    const params = new URLSearchParams({
      accountName: env.BANK_ACCOUNT_NAME,
      amount: amount.toString(),
      addInfo: donationCode
    })

    return `https://api.vietqr.io/image/${env.BANK_NAME}-${env.BANK_ACCOUNT_NUMBER}-1dDDBJn.jpg?${params.toString()}`
  }

  private async isImageAvailable(
    url: string,
    timeoutMs = 5000
  ): Promise<boolean> {
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(timeoutMs)
      })

      return (
        res.ok && res.headers.get('content-type')?.startsWith('image/') === true
      )
    } catch {
      return false
    }
  }
}
