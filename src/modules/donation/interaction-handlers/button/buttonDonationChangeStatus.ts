import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'
import { DonationHelper } from '~/modules/donation/helpers/DonationHelper'
import { DonateRepository } from '~/modules/donation/repositories/donateRepository'
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { GuildRepository } from '~/shared/repositories/guildRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { DonationStatus } from 'generated/prisma/enums'

import { NormalError } from '~/core/errorResponse'

export class ButtonDonationChangeStatusHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(CUSTOM_ID.BTN_DONATION_CHANGE_STATUS_PREFIX))
      return this.none()
    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const targetStatus = parts[1] as DonationStatus
    const donationId = parts[2]

    return this.some({ targetStatus, donationId })
  }

  public async run(interaction: ButtonInteraction, result: InteractionHandler.ParseResult<this>) {
    await interaction.deferUpdate()

    if (!interaction || !interaction.guild) return
    if (!result) return

    const { targetStatus, donationId } = result as {
      targetStatus: DonationStatus
      donationId: string
    }
    if (!donationId || !targetStatus) return

    const donation = await DonateRepository.findById(donationId)

    if (!donation) {
      throw new NormalError('Không tìm thấy giao dịch quyên góp này trong hệ thống.')
    }

    if (targetStatus === DonationStatus.TRANSFERRED) {
      if (donation.status === DonationStatus.TRANSFERRED) {
        throw new NormalError('Giao dịch này đã được xác nhận rồi.')
      }

      await DonateRepository.markAsTransferred(donation.id)

      const updatedDonation = await DonateRepository.findById(donation.id)
      if (!updatedDonation) return

      await DonationHelper.sendDonationNotification({
        guildId: interaction.guild.id,
        donation: updatedDonation,
        event: 'ADMIN_STATUS_CHANGED'
      })

      try {
        const guildConfig = await GuildRepository.findCached(interaction.guild.id)
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
    } else if (targetStatus === DonationStatus.CANCELED) {
      if (donation.status === DonationStatus.CANCELED) {
        throw new NormalError('Giao dịch này đã bị hủy trước đó.')
      }

      await DonateRepository.cancel(donation.id)

      const updatedDonation = await DonateRepository.findById(donation.id)
      if (!updatedDonation) return

      await DonationHelper.sendDonationNotification({
        guildId: interaction.guild.id,
        donation: updatedDonation,
        event: 'ADMIN_STATUS_CHANGED'
      })

      await InteractionUtil.replySuccess(
        interaction,
        `Giao dịch #${donation.code} đã được chuyển sang trạng thái **${DonationHelper.getStatusText(targetStatus)}**.`
      )
    }
  }
}
