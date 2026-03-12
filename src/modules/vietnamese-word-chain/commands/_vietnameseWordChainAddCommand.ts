import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChatInputCommandInteraction
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

export class VietnameseWordChainAddCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_VIETNAMESE_WORDCHAIN_ADD)
      .setTitle('Thêm từ nối mới')

    const phrasesInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_VIETNAMESE_WORDCHAIN_PHRASES)
      .setPlaceholder('hoa hồng\nhồng nhung\nnhung hươu')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)

    const phrasesLabel = new LabelBuilder()
      .setLabel('Nhập danh sách từ')
      .setDescription('Mỗi từ 1 dòng, mỗi dòng gồm đúng 2 từ.')
      .setTextInputComponent(phrasesInput)

    modal.addLabelComponents(phrasesLabel)

    await interaction.showModal(modal)
  }
}
