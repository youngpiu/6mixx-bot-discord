import { ApplyOptions, RequiresGuildContext } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonDonationCreate extends InteractionHandler {
  // Shows the donation creation modal when the button is clicked
  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_DONATION_CREATE)
      return this.none()
    return this.some()
  }

  @RequiresGuildContext()
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
      .setTextInputComponent(amountInput)

    const messageLabel = new LabelBuilder()
      .setLabel('Lời nhắn (không bắt buộc)')
      .setTextInputComponent(messageInput)

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_DONATION_CREATE)
      .setTitle('Quyên góp')
      .addLabelComponents(amountLabel, messageLabel)

    await interaction.showModal(modal)
  }
}
