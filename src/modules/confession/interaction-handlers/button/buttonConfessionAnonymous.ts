// Handler for anonymous confession button
import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { lines } from '~/shared/utils/textUtil'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonConfessionAnonymous extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_CONFESSION_SEND_ANONYMOUS)
      return this.none()
    return this.some()
  }

  public async run(interaction: ButtonInteraction) {
    // Check DM permission first
    let canDm = true
    try {
      await interaction.user.send({ content: ' ' })
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).code === 50007) canDm = false
    }

    if (!canDm) {
      throw new NormalError(
        lines(
          'Bot không thể gửi tin nhắn riêng cho bạn.',
          'Vui lòng mở khóa tin nhắn riêng (Allow Direct Messages) trong cài đặt máy chủ để tiếp tục.',
          '- **Bước 1:** Chuột phải vào biểu tượng server > Privacy Settings',
          '- **Bước 2:** Bật "Direct Messages"'
        )
      )
    }

    // Create modal
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_CONFESSION_ANONYMOUS)
      .setTitle('Gửi Confession Ẩn Danh')

    const contentInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_CONTENT)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Nhập nội dung bạn muốn chia sẻ...')
      .setMaxLength(2000)
      .setRequired(true)

    const contentLabel = new LabelBuilder()
      .setLabel('Nội dung Confession')
      .setDescription('Chia sẻ câu chuyện của bạn')
      .setTextInputComponent(contentInput)

    const attachmentUpload = new FileUploadBuilder()
      .setCustomId('input-confession-attachment')
      .setRequired(false)

    const attachmentLabel = new LabelBuilder()
      .setLabel('Hình ảnh đính kèm')
      .setDescription('Tải lên hình ảnh nếu muốn (tùy chọn)')
      .setFileUploadComponent(attachmentUpload)

    modal.addLabelComponents(contentLabel, attachmentLabel)

    await interaction.showModal(modal)
  }
}
