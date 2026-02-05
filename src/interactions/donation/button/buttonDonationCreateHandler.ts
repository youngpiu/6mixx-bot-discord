import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import {
  ButtonInteraction,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

export class ButtonDonationCreateHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-donation-create') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    const amountInput = new TextInputBuilder()
      .setCustomId('input-donation-amount')
      .setPlaceholder('Ví dụ: 1000, 5000, 10000,...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const messageInput = new TextInputBuilder()
      .setCustomId('input-donation-message')
      .setPlaceholder('Nhập lời nhắn gửi kèm nếu có...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)

    const amountLabel = new LabelBuilder()
      .setLabel('Số tiền quyên góp')
      .setDescription('Mọi sự đóng góp đều đáng trân trọng, xin cảm ơn sự ủng hộ của bạn.')
      .setTextInputComponent(amountInput)

    const messageLabel = new LabelBuilder()
      .setLabel('Lời nhắn (không bắt buộc)')
      .setTextInputComponent(messageInput)

    const modal = new ModalBuilder()
      .setCustomId('modal-donation-create')
      .setTitle('Quyên góp ủng hộ')
      .addLabelComponents(amountLabel, messageLabel)

    await interaction.showModal(modal)
  })
}
