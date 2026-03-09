// Handler to change donation status (Admin actions)
import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { DonationStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { GuildRepository } from '~/shared/repositories/guildRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { DonationHelper } from '~/modules/donation/helpers/DonationHelper'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonDonationChangeStatusHandler extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (
      !interaction.customId.startsWith(
        CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX
      )
    )
      return this.none()
    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const targetStatus = parts[1] as DonationStatus
    const donationId = parts[2]

    return this.some({ targetStatus, donationId })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    await interaction.deferUpdate()

    if (!interaction.guild) return

    const { targetStatus, donationId } = result

    const donation = await DonateRepository.findById(donationId)

    if (!donation) throw new NormalError('Không tìm thấy giao dịch này.')

    if (donation.status === targetStatus)
      throw new NormalError(
        targetStatus === DonationStatus.TRANSFERRED
          ? 'Giao dịch này đã được xác nhận rồi.'
          : 'Giao dịch này đã bị hủy trước đó.'
      )

    const updatedDonation = await DonateRepository.updateStatus(
      donation.id,
      targetStatus
    )

    await DonationHelper.sendDonationNotification({
      guildId: interaction.guild.id,
      donation: updatedDonation,
      event: 'ADMIN_STATUS_CHANGED'
    })

    if (targetStatus === DonationStatus.TRANSFERRED) {
      try {
        const guildConfig = await GuildRepository.findCached(
          interaction.guild.id
        )
        await DonationHelper.sendThankYouMessage(guildConfig, updatedDonation)
      } catch (error) {
        this.container.logger.error(error)
      }

      await InteractionUtil.replySuccess(
        interaction,
        'Xác nhận thành công',
        donation.status === DonationStatus.CANCELED
          ? 'Giao dịch đã được khôi phục và xác nhận thành công.'
          : 'Giao dịch đã được xác nhận thành công.'
      )
    } else {
      await InteractionUtil.replySuccess(
        interaction,
        `Giao dịch #${donation.code} đã được chuyển sang trạng thái **${DonationHelper.getStatusText(targetStatus)}**.`
      )
    }
  }
}
