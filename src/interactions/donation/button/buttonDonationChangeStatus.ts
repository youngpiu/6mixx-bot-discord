import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { DonationStatus } from 'generated/prisma/enums'

import { CUSTOM_ID } from '~/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

import { DonationHelper } from '~/helpers/DonationHelper'
import { InteractionUtil } from '~/utils/messageUtil'

import { DonateRepository } from '~/repositories/donateRepository'
import { GuildRepository } from '~/repositories/guildRepository'

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

      await DonateRepository.markAsTransferred({
        donationId: donation.id,
        confirmedBy: interaction.user.id
      })

      const updatedDonation = await DonateRepository.findById(donation.id)
      if (!updatedDonation) return

      await DonationHelper.sendDonationNotification({
        guildId: interaction.guildId!,
        donation: updatedDonation,
        event: 'ADMIN_STATUS_CHANGED'
      })

      try {
        const guildConfig = await GuildRepository.getGuildCached(interaction.guildId!)
        await DonationHelper.sendThankYouMessage(guildConfig, updatedDonation)
      } catch (error) {
        this.container.logger.error(error)
      }

      await interaction.editReply({
        embeds: [
          {
            title: 'Xác nhận thành công',
            description:
              donation.status === DonationStatus.CANCELED
                ? 'Giao dịch đã được khôi phục và xác nhận thành công.'
                : 'Giao dịch đã được xác nhận thành công.',
            color: 0x57f287
          }
        ],
        components: []
      })
    } else if (targetStatus === DonationStatus.CANCELED) {
      if (donation.status === DonationStatus.CANCELED) {
        throw new NormalError('Giao dịch này đã bị hủy trước đó.')
      }

      await DonateRepository.cancelDonation(donation.id)

      const updatedDonation = await DonateRepository.findById(donation.id)
      if (!updatedDonation) return

      await DonationHelper.sendDonationNotification({
        guildId: interaction.guildId!,
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
