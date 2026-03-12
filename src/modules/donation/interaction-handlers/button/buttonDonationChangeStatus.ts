import { ApplyOptions, RequiresGuildContext } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { DonationStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

import { ANIMATED_EMOJI } from '~/shared/constants/emojiConstant'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
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

  @RequiresGuildContext()
  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    await interaction.deferUpdate().catch()

    const { targetStatus, donationId } = result

    const donation = await DonateRepository.findById(donationId)

    if (!donation) throw new NormalError('Không tìm thấy khoản quyên góp này.')

    if (donation.status === targetStatus)
      throw new NormalError(
        targetStatus === DonationStatus.TRANSFERRED
          ? 'Khoản quyên góp này đã được xác nhận trước đó rồi.'
          : 'Khoản quyên góp này đã bị hủy trước đó rồi.'
      )

    const updatedDonation = await DonateRepository.updateStatus(
      donation.id,
      targetStatus
    )

    const asyncTasks: Promise<unknown>[] = [
      DonationHelper.sendDonationNotification({
        guildId: interaction.guild!.id,
        donation: updatedDonation,
        event: 'ADMIN_STATUS_CHANGED'
      })
    ]

    if (targetStatus === DonationStatus.TRANSFERRED) {
      asyncTasks.push(
        SettingRepository.find(interaction.guild!.id)
          .then((guildConfig) =>
            DonationHelper.sendThankYouMessage(guildConfig, updatedDonation)
          )
          .catch(() => {
            // ignore
          }),
        InteractionUtil.sendDM(
          donation.donorId,
          `${ANIMATED_EMOJI.HEART} Mình đã nhận được số tiền **${donation.amount.toLocaleString('vi-VN')}đ** từ khoản quyên góp \`#${donation.code}\` của bạn, cảm ơn bạn rất nhiều.`
        )
      )
    }

    await Promise.all(asyncTasks)

    await InteractionUtil.replySuccess(
      interaction,
      `Khoản quyên góp \`#${donation.code}\` đã được chuyển sang trạng thái \`${DonationHelper.getStatusText(targetStatus)}\`.`
    )
  }
}
