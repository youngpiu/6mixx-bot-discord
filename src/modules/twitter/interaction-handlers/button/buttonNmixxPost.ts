import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
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
      interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_OTP
    ) {
      return this.some({
        isOtp: interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_OTP
      })
    }
    return this.none()
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    const { isOtp } = result

    const modal = new ModalBuilder()
      .setCustomId(
        isOtp
          ? CUSTOM_ID.MODAL_NMIXX_POST_OTP
          : CUSTOM_ID.MODAL_NMIXX_POST_SINGLE
      )
      .setTitle(isOtp ? 'Đăng ảnh OTP' : 'Đăng ảnh một thành viên')

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

    await interaction.showModal(modal)
  }
}
