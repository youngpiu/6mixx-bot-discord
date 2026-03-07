import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import {
  ButtonInteraction,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'

export class ButtonDonationCreateHandler extends InteractionHandler {
  /**
   * Handles the creation of a new donation via button interaction.
   * Displays the donation modal.
   */
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_DONATION_CREATE) return this.none()
    return this.some()
  }

  public async run(interaction: ButtonInteraction) {
    const amountInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_DONATION_AMOUNT)
      .setPlaceholder('Ví dụ: 1000, 5000, 10000,...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const messageInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_DONATION_MESSAGE)
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
      .setCustomId(CUSTOM_ID.MODAL_DONATION_CREATE)
      .setTitle('Quyên góp ủng hộ')
      .addLabelComponents(amountLabel, messageLabel)

    await interaction.showModal(modal)
  }
}
