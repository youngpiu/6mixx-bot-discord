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
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { MEMBER_ARRAY } from '~/shared/constants/name'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonGalleryPostManual extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_MANUAL) {
      return this.some()
    }
    return this.none()
  }

  public async run(interaction: ButtonInteraction) {
    const modal = new ModalBuilder()
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
      .setPlaceholder('VD: 15.03.2026 hoặc 15/03/2026')
      .setRequired(false)

    const dateLabel = new LabelBuilder()
      .setLabel('Ngày đăng (Không bắt buộc)')
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

    const memberSelect = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP)
      .setPlaceholder('Chọn một hoặc nhiều thành viên')
      .addOptions(
        ...MEMBER_ARRAY.map((m) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(m.toUpperCase())
            .setValue(m.toUpperCase())
        )
      )
      .setMinValues(1)
      .setMaxValues(MEMBER_ARRAY.length)

    const memberLabel = new LabelBuilder()
      .setLabel('Thành viên')
      .setDescription(
        'Nếu chọn nhiều hơn 1 thành viên, bài viết sẽ được đăng vào kênh OTP.'
      )
      .setStringSelectMenuComponent(memberSelect)

    modal.addLabelComponents(userLabel, dateLabel, mediaLabel, memberLabel)
    await interaction.showModal(modal)
  }
}
