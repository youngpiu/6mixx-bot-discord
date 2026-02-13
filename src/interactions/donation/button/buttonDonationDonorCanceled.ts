import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { BadRequestError, NotFoundError } from '~/core/errorResponse'

import { DonationHelper } from '~/helpers/DonationHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { DonateRepository } from '~/repositories/donateRepository'

export class ButtonDonationDonorCanceledHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('btn-donation-donor-canceled:')) return this.none()
    const donationId = interaction.customId.split(':')[1]
    return this.some({ donationId })
  }

  public run = asyncInteractionHandler<ButtonInteraction, { donationId: string }>(
    async (interaction, result) => {
      await interaction.deferUpdate()

      if (!result) return

      const { donationId } = result
      if (!donationId) return

      const donation = await DonateRepository.findById(donationId)

      if (!donation) {
        throw new NotFoundError({
          description: 'Không tìm thấy giao dịch quyên góp này trong hệ thống.'
        })
      }

      if (donation.status !== 'PENDING') {
        throw new BadRequestError({
          description:
            donation.status === 'CANCELED'
              ? 'Giao dịch này đã bị hủy trước đó.'
              : 'Giao dịch này đã được xác nhận, không thể hủy.'
        })
      }

      await DonateRepository.cancelDonation(donation.id)

      // Retrieve updated donation data
      const updatedDonation = await DonateRepository.findById(donation.id)
      if (!updatedDonation) return

      // Send cancellation notification
      await DonationHelper.sendDonationNotification({
        guildId: interaction.guildId!,
        donation: updatedDonation,
        event: 'CANCELED'
      })

      await interaction.editReply({
        embeds: [
          createSuccessEmbed({
            title: 'Hủy giao dịch thành công',
            description:
              'Cảm ơn bạn đã quan tâm đến việc quyên góp, hy vọng bạn sẽ ủng hộ dự án này vào dịp khác.'
          })
        ],
        components: []
      })

      await deleteReplyInteraction(interaction)
    }
  )
}
