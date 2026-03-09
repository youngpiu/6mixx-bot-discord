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
import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { lines } from '~/shared/utils/textUtil'

import { NormalError } from '~/core/errorResponse'

export class ButtonConfessionPublic extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_CONFESSION_SEND_PUBLIC)
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

    // Create modal with V2 Components
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_CONFESSION_NAMED)
      .setTitle('Gửi Confession Công Khai')

    // Text input for content
    const contentInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_CONTENT)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Nhập nội dung bạn muốn chia sẻ...')
      .setMaxLength(2000)
      .setRequired(true)

    const contentLabel = new LabelBuilder()
      .setLabel('Nội dung')
      .setTextInputComponent(contentInput)

    // File upload for attachment
    const attachmentUpload = new FileUploadBuilder()
      .setCustomId('input-confession-attachment')
      .setRequired(false)
      .setMaxValues(5)

    const attachmentLabel = new LabelBuilder()
      .setLabel('Hình ảnh đính kèm (tùy chọn)')
      .setFileUploadComponent(attachmentUpload)

    // Add labels to modal
    modal.addLabelComponents(contentLabel, attachmentLabel)

    await interaction.showModal(modal)
  }
}
