import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

export class ButtonDonationConfirmHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('btn-donation-confirm:')) return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    const code = interaction.customId.split(':')[1]

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('Xác nhận quyên góp')
      .setDescription(`Bạn đã nhận được khoản tiền quyên góp với mã **#${code}** chưa?`)

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn-donation-confirm-no:${code}`)
        .setLabel('Chưa')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`btn-donation-confirm-yes:${code}`)
        .setLabel('Rồi')
        .setStyle(ButtonStyle.Success)
    )

    await interaction.update({ embeds: [embed], components: [row] })
  })
}
