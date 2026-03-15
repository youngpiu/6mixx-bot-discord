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
import { NMIXX_MEMBERS } from '~/shared/constants/nmixxConstant'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonGalleryPostX extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId === CUSTOM_ID.BTN_NMIXX_POST_X) {
      return this.some()
    }
    return this.none()
  }

  public async run(interaction: ButtonInteraction) {
    const modal = new ModalBuilder()
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

    const memberSelect = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_NMIXX_MEMBER_OTP)
      .setPlaceholder('Chọn một hoặc nhiều thành viên')
      .addOptions(NMIXX_MEMBERS)
      .setMinValues(1)
      .setMaxValues(NMIXX_MEMBERS.length)

    const memberLabel = new LabelBuilder()
      .setLabel('Thành viên')
      .setDescription(
        'Nếu chọn nhiều hơn 1 thành viên, bài viết sẽ được đăng vào kênh OTP.'
      )
      .setStringSelectMenuComponent(memberSelect)

    modal.addLabelComponents(urlLabel, memberLabel)
    await interaction.showModal(modal)
  }
}
