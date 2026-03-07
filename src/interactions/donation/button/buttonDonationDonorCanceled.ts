import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

import { DonationHelper } from '~/helpers/DonationHelper'
import { InteractionUtil } from '~/utils/messageUtil'

import { DonateRepository } from '~/repositories/donateRepository'

export class ButtonDonationDonorCanceledHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.BTN_DONATION_DONOR_CANCELED_PREFIX))
      return this.none()
    const donationId = interaction.customId.split(':')[1]
    return this.some({ donationId })
  }

  public async run(interaction: ButtonInteraction, result: InteractionHandler.ParseResult<this>) {
    await interaction.deferUpdate()

    if (!result) return

    const { donationId } = result as { donationId: string }
    if (!donationId) return

    const donation = await DonateRepository.findById(donationId)

    if (!donation) {
      throw new NormalError('Không tìm thấy giao dịch quyên góp này trong hệ thống.')
    }

    if (donation.status !== 'PENDING') {
      throw new NormalError(
        donation.status === 'CANCELED'
          ? 'Giao dịch này đã bị hủy trước đó.'
          : 'Giao dịch này đã được xác nhận, không thể hủy.'
      )
    }

    await DonateRepository.cancelDonation(donation.id)

    const updatedDonation = await DonateRepository.findById(donation.id)
    if (!updatedDonation) return

    await DonationHelper.sendDonationNotification({
      guildId: interaction.guildId!,
      donation: updatedDonation,
      event: 'CANCELED'
    })

    await InteractionUtil.replySuccess(
      interaction,
      'Cảm ơn bạn đã quan tâm đến việc quyên góp, hy vọng bạn sẽ ủng hộ dự án này vào dịp khác.',
      { components: [] }
    )
  }
}
