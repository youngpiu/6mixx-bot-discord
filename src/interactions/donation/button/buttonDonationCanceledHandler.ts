import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, EmbedBuilder } from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { DonateRepository } from '~/repositories/donateRepository'

export class ButtonDonationCanceledHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('btn-donation-canceled:')) return this.none()
    const donationId = interaction.customId.split(':')[1]
    return this.some({ donationId })
  }

  public run = asyncInteractionHandler<ButtonInteraction, { donationId: string }>(
    async (interaction, result) => {
      await interaction.deferReply({ flags: ['Ephemeral'] })

      if (!result) return

      const { donationId } = result
      if (!donationId) return

      await DonateRepository.cancelDonation(donationId)

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle('🧡 Cảm ơn bạn đã quan tâm!')
        .setDescription(
          'Cảm ơn bạn đã quan tâm đến việc quyên góp. Hy vọng bạn sẽ ủng hộ chúng mình vào dịp khác.'
        )

      await interaction.editReply({
        embeds: [embed],
        components: []
      })

      await deleteReplyInteraction(interaction)
    }
  )
}
