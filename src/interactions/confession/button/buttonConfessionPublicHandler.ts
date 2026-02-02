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

export class ButtonConfessionPublicHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-confession-named') return this.none()
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
      .setCustomId('modal-confession-named')
      .setTitle('Gửi Confession Công Khai')

    // Text input for content
    const contentInput = new TextInputBuilder()
      .setCustomId('content')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Nhập nội dung bạn muốn chia sẻ...')
      .setMaxLength(2000)
      .setRequired(true)

    const contentLabel = new LabelBuilder().setLabel('Nội dung').setTextInputComponent(contentInput)

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
  })
}
