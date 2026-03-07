import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'
import { NormalError } from '~/core/errorResponse'

export class DonationDisbursementAddCommand {
  /**
   * Main entry point for the disbursement add command.
   * Displays a modal for creating a new disbursement.
   *
   * @param interaction - The chat input command interaction
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const amountInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_AMOUNT)
      .setPlaceholder('VD: 100000, 100k, 100,000đ')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const descriptionInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_DESCRIPTION)
      .setPlaceholder('Mô tả chi tiết về khoản giải ngân này')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)

    const amountLabel = new LabelBuilder().setLabel('Số tiền').setTextInputComponent(amountInput)

    const descriptionLabel = new LabelBuilder()
      .setLabel('Mô tả')
      .setTextInputComponent(descriptionInput)

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_DISBURSEMENT_CREATE)
      .setTitle('Tạo giải ngân mới')
      .addLabelComponents(amountLabel, descriptionLabel)

    await interaction.showModal(modal)
  }
}
