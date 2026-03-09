import {
  ChatInputCommandInteraction,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

export class DisbursementAddCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_DISBURSEMENT_CREATE)
      .setTitle('Thêm khoản chi mới')

    const amountInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_DISBURSEMENT_AMOUNT)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ví dụ: 500000')
      .setRequired(true)

    const amountLabel = new LabelBuilder()
      .setLabel('Số tiền (VND)')
      .setTextInputComponent(amountInput)

    const descriptionInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_DISBURSEMENT_DESCRIPTION)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Ví dụ: Tiền mua VPS tháng 10')
      .setMaxLength(1000)
      .setRequired(true)

    const descriptionLabel = new LabelBuilder()
      .setLabel('Mô tả khoản chi')
      .setTextInputComponent(descriptionInput)

    const imagesUpload = new FileUploadBuilder()
      .setCustomId(CUSTOM_ID.UPLOAD_DISBURSEMENT_IMAGES)
      .setMinValues(1)
      .setMaxValues(10)
      .setRequired(true)

    const imagesLabel = new LabelBuilder()
      .setLabel('Ảnh minh chứng (Bill)')
      .setDescription('Tối đa 10 ảnh.')
      .setFileUploadComponent(imagesUpload)

    modal.addLabelComponents(amountLabel, descriptionLabel, imagesLabel)

    await interaction.showModal(modal)
  }
}
