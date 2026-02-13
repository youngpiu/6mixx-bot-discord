import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { DonationStatus } from 'generated/prisma/enums'

import { BadRequestError, NotFoundError } from '~/core/errorResponse'

import { DonationHelper } from '~/helpers/DonationHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

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
    if (!interaction.customId.startsWith('btn-donation-change-status:')) return this.none()
    const parts = interaction.customId.split(':')
    if (parts.length < 3) return this.none()

    const targetStatus = parts[1] as DonationStatus
    const donationId = parts[2]

    return this.some({ targetStatus, donationId })
  }

  public run = asyncInteractionHandler<
    ButtonInteraction,
    { targetStatus: DonationStatus; donationId: string }
  >(async (interaction, result) => {
    await interaction.deferUpdate()

    if (!result) return

    const { targetStatus, donationId } = result
    if (!donationId || !targetStatus) return

    const donation = await DonateRepository.findById(donationId)

    if (!donation) {
      throw new NotFoundError({
        description: 'Không tìm thấy giao dịch quyên góp này trong hệ thống.'
      })
    }

    // Verify if status transition is valid
    if (targetStatus === DonationStatus.TRANSFERRED) {
      if (donation.status === DonationStatus.TRANSFERRED) {
        throw new BadRequestError({
          description: 'Giao dịch này đã được xác nhận rồi.'
        })
      }

      // Update status to TRANSFERRED
      await DonateRepository.markAsTransferred({
        donationId: donation.id,
        confirmedBy: interaction.user.id
      })

      // Fetch updated donation for notification
      const updatedDonation = await DonateRepository.findById(donation.id)
      if (!updatedDonation) return

      // Send notification
      await DonationHelper.sendDonationNotification({
        guildId: interaction.guildId!,
        donation: updatedDonation,
        event: 'ADMIN_STATUS_CHANGED'
      })

      try {
        const guildConfig = await GuildRepository.getGuildCached(interaction.guildId!)
        await DonationHelper.sendThankYouMessage(guildConfig, updatedDonation)
      } catch {}

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
        throw new BadRequestError({
          description: 'Giao dịch này đã bị hủy trước đó.'
        })
      }

      await DonateRepository.cancelDonation(donation.id)

      // Fetch updated donation for notification
      const updatedDonation = await DonateRepository.findById(donation.id)
      if (!updatedDonation) return

      // Send notification
      await DonationHelper.sendDonationNotification({
        guildId: interaction.guildId!,
        donation: updatedDonation,
        event: 'ADMIN_STATUS_CHANGED'
      })

      await interaction.editReply({
        embeds: [
          createSuccessEmbed({
            title: 'Đổi trạng thái thành công',
            description: `Giao dịch #${donation.code} đã được chuyển sang trạng thái **${DonationHelper.getStatusText(targetStatus)}**.`
          })
        ],
        components: []
      })
      await deleteReplyInteraction(interaction)
    }
  })
}
