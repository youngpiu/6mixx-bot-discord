import { ApplyOptions, RequiresGuildContext } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { DonationStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { DonationHelper } from '~/modules/donation/helpers/DonationHelper'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'

type ActionType = 'CONFIRMED' | 'CANCELED'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonDonationDonorUpdateStatusHandler extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    const { customId } = interaction
    let type: ActionType | undefined

    if (customId.startsWith(CUSTOM_ID.BTN_DONATION_DONOR_CONFIRMED_PREFIX)) {
      type = 'CONFIRMED'
    } else if (
      customId.startsWith(CUSTOM_ID.BTN_DONATION_DONOR_CANCELED_PREFIX)
    ) {
      type = 'CANCELED'
    }

    if (!type) return this.none()

    const donationId = customId.split(':')[1]
    return this.some({ donationId, type })
  }

  @RequiresGuildContext()
  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    await interaction.deferUpdate()

    const { donationId, type } = result
    if (!donationId) return

    const donation = await DonateRepository.findById(donationId)

    if (!donation) {
      throw new NormalError('Không tìm thấy khoản quyên góp này.')
    }

    if (donation.status !== DonationStatus.PENDING) {
      throw new NormalError(
        donation.status === DonationStatus.CANCELED
          ? 'Khoản quyên góp này đã bị hủy trước đó rồi.'
          : 'Khoản quyên góp này đã được xác nhận trước đó rồi.'
      )
    }

    const nextStatus =
      type === 'CONFIRMED'
        ? DonationStatus.PENDING_VERIFICATION
        : DonationStatus.CANCELED

    const updatedDonation = await DonateRepository.updateStatus(
      donationId,
      nextStatus
    )

    await DonationHelper.sendDonationNotification({
      guildId: interaction.guild!.id,
      donation: updatedDonation,
      event: nextStatus
    })

    const successMessage =
      type === 'CONFIRMED'
        ? 'Chân thành cảm ơn bạn đã chuyển khoản ủng hộ dự án, mình sẽ xác nhận sớm nhất có thể.'
        : 'Cảm ơn bạn đã quan tâm đến dự án, hy vọng sẽ nhận được sự ủng hộ của bạn trong thời gian tới.'

    await InteractionUtil.replySuccess(interaction, successMessage)
  }
}
