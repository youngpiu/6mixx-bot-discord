import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'
import { DELETE_REPLY_TIMEOUT } from '~/config/time'

import { NotFoundError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { DonateRepository } from '~/repositories/donateRepository'

export class ButtonDonationConfirmYesHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('btn-donation-confirm-yes:')) return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    const code = interaction.customId.split(':')[1]

    const donation = await DonateRepository.findByCode(code)

    if (!donation) {
      throw new NotFoundError({
        description: 'Hệ thống không tìm thấy mã quyên góp này trong cơ sở dữ liệu.'
      })
    }

    await DonateRepository.confirmDonation({
      code: donation.code,
      guildId: interaction.guildId!,
      confirmedBy: interaction.user.id
    })

    const descriptionParts = [
      `Bạn đã xác nhận là đã nhận được khoản quyên góp với mã giao dịch **#${donation.code}** do **#${donation.donor?.donorCode}** gửi.`
    ]

    await interaction.update({
      embeds: [
        createSuccessEmbed({
          title: 'Xác nhận thành công',
          description: descriptionParts.join('\n')
        })
      ],
      components: []
    })

    await deleteReplyInteraction(interaction, DELETE_REPLY_TIMEOUT.SHORT)
  })
}
