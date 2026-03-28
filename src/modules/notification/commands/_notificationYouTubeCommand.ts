import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

export class NotificationYouTubeCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_YOUTUBE)
      .setTitle('Gửi thông báo YouTube')

    const urlInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_YOUTUBE_URL)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://www.youtube.com/watch?v=...')
      .setRequired(true)

    const urlLabel = new LabelBuilder()
      .setLabel('Link video YouTube')
      .setTextInputComponent(urlInput)

    const titleInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_YOUTUBE_TITLE)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Nhập tiêu đề đã dịch để thay thế tiêu đề gốc (Tuỳ chọn)')
      .setRequired(false)

    const titleLabel = new LabelBuilder()
      .setLabel('Tiêu đề đã dịch (Tuỳ chọn)')
      .setTextInputComponent(titleInput)

    modal.addLabelComponents(urlLabel, titleLabel)

    return interaction.showModal(modal)
  }
}
