import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, EmbedBuilder } from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

export class ButtonDonationConfirmNoHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('btn-donation-confirm-no:')) return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    const code = interaction.customId.split(':')[1]

    const embed = new EmbedBuilder()
      .setColor('Orange')
      .setTitle('Xác nhận thất bại')
      .setDescription(
        `Bạn đã xác nhận là chưa nhận được khoản quyên góp với mã giao dịch **#${code}**, vui lòng kiểm tra lại sau.`
      )

    await interaction.update({ embeds: [embed], components: [] })
    await deleteReplyInteraction(interaction)
  })
}
