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
  StringSelectMenuBuilder
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { NMIXX_MEMBERS } from '~/shared/constants/nmixxConstant'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonGalleryPostCollection extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_COLLECTION) {
      return this.some()
    }
    return this.none()
  }

  public async run(interaction: ButtonInteraction) {
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_NMIXX_POST_COLLECTION)
      .setTitle('Tạo bộ sưu tập mới')

    const memberSelect = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP)
      .setPlaceholder('Chọn một hoặc nhiều thành viên')
      .addOptions(NMIXX_MEMBERS)
      .setMinValues(1)
      .setMaxValues(NMIXX_MEMBERS.length)

    const memberLabel = new LabelBuilder()
      .setLabel('Thành viên')
      .setStringSelectMenuComponent(memberSelect)

    const thumbnailUpload = new FileUploadBuilder()
      .setCustomId(CUSTOM_ID.INPUT_NMIXX_COLLECTION_THUMBNAIL)
      .setMinValues(1)
      .setMaxValues(1)
      .setRequired(true)

    const thumbnailLabel = new LabelBuilder()
      .setLabel('Ảnh đại diện kênh')
      .setDescription(
        'Ảnh này sẽ hiển thị bên ngoài danh sách kênh, vì vậy hãy chọn một ảnh đẹp nhất và nên là ảnh có tỉ lệ 1/1.'
      )
      .setFileUploadComponent(thumbnailUpload)

    modal.addLabelComponents(memberLabel, thumbnailLabel)
    await interaction.showModal(modal)
  }
}
