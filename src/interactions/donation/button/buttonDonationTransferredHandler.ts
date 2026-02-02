import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, EmbedBuilder } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { NotFoundError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { DonateRepository } from '~/repositories/donateRepository'

export class ButtonDonationTransferredHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('btn-donation-transferred:')) return this.none()
    const donationId = interaction.customId.split(':')[1]
    return this.some({ donationId })
  }

  public run = asyncInteractionHandler<ButtonInteraction, { donationId: string }>(
    async (interaction, result) => {
      await interaction.deferReply({ flags: ['Ephemeral'] })

      if (!result || !interaction.guildId) return

      const { donationId } = result
      if (!donationId) return

      const donation = await DonateRepository.findById(donationId)
      if (!donation) {
        throw new NotFoundError({
          description:
            'Hệ thống không tìm thấy giao dịch này trong cơ sở dữ liệu, vui lòng thử lại sau.'
        })
      }

      await DonateRepository.markAsPendingVerification(donationId)

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Bạn đã xác nhận chuyển khoản')
        .setDescription(
          `Cảm ơn bạn đã quyên góp số tiền **${donation.amount.toLocaleString('vi-VN')}đ**. Mình sẽ kiểm tra lại và xác nhận khoản quyên góp của bạn sớm nhất có thể.`
        )

      await interaction.editReply({
        embeds: [embed],
        components: []
      })

      await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.MEDIUM)
    }
  )
}
