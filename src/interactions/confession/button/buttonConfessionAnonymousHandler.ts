import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import {
  ButtonInteraction,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createErrorEmbed } from '~/utils/embedUtil'
import { checkDmPermission, deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

export class ButtonConfessionAnonymousHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-confession-anonymous') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    // Check DM permission first
    const canDm = await checkDmPermission(interaction)

    if (!canDm) {
      await interaction.deferReply({ flags: ['Ephemeral'] })
      await interaction.editReply({
        embeds: [
          createErrorEmbed({
            title: 'Không thể gửi tin nhắn riêng',
            description: lines(
              'Bot không thể gửi tin nhắn riêng cho bạn.',
              'Vui lòng mở khóa tin nhắn riêng (Allow Direct Messages) trong cài đặt máy chủ để tiếp tục.',
              '- **Bước 1:** Chuột phải vào biểu tượng server > Privacy Settings',
              '- **Bước 2:** Bật "Direct Messages"'
            )
          })
        ]
      })
      await deleteReplyInteraction(interaction)
      return
    }

    // Create modal with V2 Components
    const modal = new ModalBuilder()
      .setCustomId('modal-confession-anonymous')
      .setTitle('Gửi Confession Ẩn Danh')

    // Text input for content
    const contentInput = new TextInputBuilder()
      .setCustomId('content')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Nhập nội dung bạn muốn chia sẻ...')
      .setMaxLength(2000)
      .setRequired(true)

    const contentLabel = new LabelBuilder()
      .setLabel('Nội dung Confession')
      .setDescription('Chia sẻ câu chuyện của bạn')
      .setTextInputComponent(contentInput)

    // File upload for attachment
    const attachmentUpload = new FileUploadBuilder()
      .setCustomId('input-confession-attachment')
      .setRequired(false)

    const attachmentLabel = new LabelBuilder()
      .setLabel('Hình ảnh đính kèm')
      .setDescription('Tải lên hình ảnh nếu muốn (tùy chọn)')
      .setFileUploadComponent(attachmentUpload)

    // Add labels to modal
    modal.addLabelComponents(contentLabel, attachmentLabel)

    await interaction.showModal(modal)
  })
}
