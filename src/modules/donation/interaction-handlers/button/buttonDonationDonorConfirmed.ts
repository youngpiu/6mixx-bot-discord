import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'
import { DonationHelper } from '~/modules/donation/helpers/DonationHelper'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { DonationStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

export class ButtonDonationDonorConfirmedHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (
      !interaction.customId.startsWith(
        CUSTOM_ID.BTN_DONATION_DONOR_CONFIRMED_PREFIX
      )
    )
      return this.none()
    const donationId = interaction.customId.split(':')[1]
    return this.some({ donationId })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    await interaction.deferUpdate()

    if (!interaction || !interaction.guild) return
    if (!result) return

    const { donationId } = result as { donationId: string }
    if (!donationId) return

    const donation = await DonateRepository.findById(donationId)

    if (!donation) {
      throw new NormalError(
        'Không tìm thấy giao dịch quyên góp này trong hệ thống.'
      )
    }

    if (donation.status !== DonationStatus.PENDING) {
      throw new NormalError(
        donation.status === 'CANCELED'
          ? 'Giao dịch này đã bị hủy trước đó.'
          : 'Giao dịch này đã được xác nhận rồi.'
      )
    }

    await DonateRepository.updateStatus(
      donationId,
      DonationStatus.PENDING_VERIFICATION
    )

    const updatedDonation = await DonateRepository.findById(donationId)
    if (!updatedDonation) return

    await DonationHelper.sendDonationNotification({
      guildId: interaction.guild.id,
      donation: updatedDonation,
      event: 'PENDING_VERIFICATION'
    })

    await InteractionUtil.replySuccess(
      interaction,
      'Chân thành cảm ơn bạn đã chuyển khoản ủng hộ dự án, sự đóng góp của bạn vô cùng quý giá.'
    )
  }
}
