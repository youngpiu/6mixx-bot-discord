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
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

const NMIXX_MEMBERS = [
  { label: 'LILY', value: 'LILY' },
  { label: 'HAEWON', value: 'HAEWON' },
  { label: 'SULLYOON', value: 'SULLYOON' },
  { label: 'BAE', value: 'BAE' },
  { label: 'JIWOO', value: 'JIWOO' },
  { label: 'KYUJIN', value: 'KYUJIN' }
]

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonNmixxPost extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (
      interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_X ||
      interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_MANUAL ||
      interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_COLLECTION
    ) {
      return this.some({
        action: interaction.customId
      })
    }
    return this.none()
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    const { action } = result

    // 1. Create Modal
    const modal = new ModalBuilder()
    
    // 2. Member Select (Common for all)
    const memberSelect = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP)
      .setPlaceholder('Chọn thành viên hoặc nhóm NMIXX...')
      .addOptions(NMIXX_MEMBERS)
      .setMinValues(1)
      .setMaxValues(NMIXX_MEMBERS.length)

    const memberLabel = new LabelBuilder()
      .setLabel('Thành viên')
      .setStringSelectMenuComponent(memberSelect)

    // 3. Customize based on Action
    if (action === CUSTOM_ID.BTN_NMIXX_POST_X) {
      modal
        .setCustomId(CUSTOM_ID.MODAL_NMIXX_POST_X)
        .setTitle('Đăng ảnh qua link X (Twitter)')

      const urlInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT_NMIXX_TWEET_URL)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://x.com/...')
        .setRequired(true)

      const urlLabel = new LabelBuilder()
        .setLabel('Đường dẫn bài viết')
        .setTextInputComponent(urlInput)

      modal.addLabelComponents(urlLabel, memberLabel)
    } else if (action === CUSTOM_ID.BTN_NMIXX_POST_MANUAL) {
      modal
        .setCustomId(CUSTOM_ID.MODAL_NMIXX_POST_MANUAL)
        .setTitle('Đăng ảnh thủ công')

      const userInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT_NMIXX_MANUAL_USER)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Username hoặc link profile Twitter/X...')
        .setRequired(true)

      const userLabel = new LabelBuilder()
        .setLabel('Người đăng (Twitter/X)')
        .setTextInputComponent(userInput)

      const dateInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT_NMIXX_MANUAL_DATE)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: 15.03.2026 (Để trống nếu lấy hôm nay)')
        .setRequired(false)

      const dateLabel = new LabelBuilder()
        .setLabel('Ngày đăng (Tùy chọn)')
        .setTextInputComponent(dateInput)

      const mediaUpload = new FileUploadBuilder()
        .setCustomId(CUSTOM_ID.UPLOAD_NMIXX_MANUAL_MEDIA)
        .setMinValues(1)
        .setMaxValues(10)
        .setRequired(true)

      const mediaLabel = new LabelBuilder()
        .setLabel('Tải ảnh hoặc video')
        .setDescription('Tối đa 10 file.')
        .setFileUploadComponent(mediaUpload)

      modal.addLabelComponents(userLabel, dateLabel, mediaLabel, memberLabel)
    } else if (action === CUSTOM_ID.BTN_NMIXX_POST_COLLECTION) {
      modal
        .setCustomId(CUSTOM_ID.MODAL_NMIXX_POST_COLLECTION)
        .setTitle('Tạo bộ sưu tập (Thread) mới')

      const thumbnailUpload = new FileUploadBuilder()
        .setCustomId(CUSTOM_ID.INPUT_NMIXX_COLLECTION_THUMBNAIL)
        .setMinValues(1)
        .setMaxValues(1)
        .setRequired(true)

      const thumbnailLabel = new LabelBuilder()
        .setLabel('Ảnh đại diện (Thumbnail)')
        .setDescription('Ảnh này sẽ hiển thị bên ngoài danh sách Forum.')
        .setFileUploadComponent(thumbnailUpload)

      modal.addLabelComponents(memberLabel, thumbnailLabel)
    }

    await interaction.showModal(modal)
  }
}
