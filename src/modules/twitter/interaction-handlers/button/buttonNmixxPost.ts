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
      interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_SINGLE ||
      interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_OTP ||
      interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_SINGLE_MANUAL ||
      interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_OTP_MANUAL ||
      interaction.customId === CUSTOM_ID.BTN_NMIXX_COLLECTION_CREATE
    ) {
      return this.some({
        isOtp:
          interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_OTP ||
          interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_OTP_MANUAL,
        isManual:
          interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_SINGLE_MANUAL ||
          interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_OTP_MANUAL,
        isCollectionCreate:
          interaction.customId === CUSTOM_ID.BTN_NMIXX_COLLECTION_CREATE
      })
    }
    return this.none()
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    const { isOtp, isManual, isCollectionCreate } = result

    if (isCollectionCreate) {
      const modal = new ModalBuilder()
        .setCustomId(CUSTOM_ID.MODAL_NMIXX_COLLECTION_CREATE)
        .setTitle('Tạo bộ sưu tập (Thread) mới')

      const memberSelect = new StringSelectMenuBuilder()
        .setCustomId(CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP)
        .setPlaceholder('Chọn thành viên hoặc nhóm NMIXX...')
        .addOptions(NMIXX_MEMBERS)
        .setMinValues(1)
        .setMaxValues(NMIXX_MEMBERS.length)

      const memberLabel = new LabelBuilder()
        .setLabel('Thành viên của bộ sưu tập')
        .setStringSelectMenuComponent(memberSelect)

      const thumbnailUpload = new FileUploadBuilder()
        .setCustomId(CUSTOM_ID.INPUT_NMIXX_COLLECTION_THUMBNAIL)
        .setMinValues(1)
        .setMaxValues(1)
        .setRequired(true)

      const thumbnailLabel = new LabelBuilder()
        .setLabel('Ảnh đại diện cho bộ sưu tập')
        .setDescription('Ảnh này sẽ làm thumbnail cho thread trong Forum.')
        .setFileUploadComponent(thumbnailUpload)

      modal.addLabelComponents(memberLabel, thumbnailLabel)
      await interaction.showModal(modal)
      return
    }

    const modal = new ModalBuilder()
      .setCustomId(
        isManual
          ? isOtp
            ? CUSTOM_ID.MODAL_NMIXX_POST_OTP_MANUAL
            : CUSTOM_ID.MODAL_NMIXX_POST_SINGLE_MANUAL
          : isOtp
            ? CUSTOM_ID.MODAL_NMIXX_POST_OTP
            : CUSTOM_ID.MODAL_NMIXX_POST_SINGLE
      )
      .setTitle(
        isManual
          ? isOtp
            ? 'Đăng ảnh OTP thủ công'
            : 'Đăng đơn thủ công'
          : isOtp
            ? 'Đăng ảnh OTP'
            : 'Đăng ảnh một thành viên'
      )

    if (isManual) {
      const userInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT_NMIXX_MANUAL_USER)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Username hoặc link profile Twitter/X...')
        .setRequired(true)

      const userLabel = new LabelBuilder()
        .setLabel('Thông tin người đăng (Twitter/X)')
        .setTextInputComponent(userInput)

      const dateInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT_NMIXX_MANUAL_DATE)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(
          'VD: 15.03.2026 hoặc 15/03/2026 (Để trống nếu lấy hôm nay)'
        )
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
        .setDescription('Bạn có thể chọn tối đa 10 file.')
        .setFileUploadComponent(mediaUpload)

      const memberSelect = new StringSelectMenuBuilder()
        .setCustomId(
          isOtp
            ? CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP
            : CUSTOM_ID.SELECT_NMIXX_MEMBER_SINGLE
        )
        .setPlaceholder('Chọn thành viên...')
        .addOptions(NMIXX_MEMBERS)
        .setMinValues(isOtp ? 2 : 1)
        .setMaxValues(isOtp ? NMIXX_MEMBERS.length : 1)

      const memberLabel = new LabelBuilder()
        .setLabel(isOtp ? 'Chọn các thành viên' : 'Chọn thành viên')
        .setStringSelectMenuComponent(memberSelect)

      modal.addLabelComponents(userLabel, dateLabel, mediaLabel, memberLabel)
    } else {
      const urlInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT_NMIXX_TWEET_URL)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://x.com/...')
        .setRequired(true)

      const urlLabel = new LabelBuilder()
        .setLabel('Đường dẫn tới bài viết Twitter/X')
        .setTextInputComponent(urlInput)

      const memberSelect = new StringSelectMenuBuilder()
        .setCustomId(
          isOtp
            ? CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP
            : CUSTOM_ID.SELECT_NMIXX_MEMBER_SINGLE
        )
        .setPlaceholder('Chọn thành viên...')
        .addOptions(NMIXX_MEMBERS)
        .setMinValues(isOtp ? 2 : 1)
        .setMaxValues(isOtp ? NMIXX_MEMBERS.length : 1)

      const memberLabel = new LabelBuilder()
        .setLabel(isOtp ? 'Chọn các thành viên' : 'Chọn thành viên')
        .setStringSelectMenuComponent(memberSelect)

      modal.addLabelComponents(urlLabel, memberLabel)
    }

    await interaction.showModal(modal)
  }
}
