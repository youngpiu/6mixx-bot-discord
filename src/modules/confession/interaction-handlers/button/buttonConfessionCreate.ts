import { ApplyOptions, RequiresGuildContext } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
  DiscordAPIError,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonConfessionCreate extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (
      interaction.customId === CUSTOM_ID.BTN_CONFESSION_SEND_ANONYMOUS ||
      interaction.customId === CUSTOM_ID.BTN_CONFESSION_SEND_PUBLIC
    ) {
      const isAnonymous =
        interaction.customId === CUSTOM_ID.BTN_CONFESSION_SEND_ANONYMOUS

      let canDm = true
      try {
        await interaction.user.send({ content: ' ' })
      } catch (error: unknown) {
        if (error instanceof DiscordAPIError && error.code === 50007) {
          canDm = false
        }
      }

      return this.some({ isAnonymous, canDm })
    }

    return this.none()
  }

  @RequiresGuildContext()
  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    if (!result) return
    const { isAnonymous, canDm } = result

    if (!canDm)
      throw new NormalError(
        `Vui lòng bật tính năng DM (Direct Message) trong cài đặt máy chủ để tiếp tục, nếu không biết cách hãy truy cập [Hướng dẫn](https://support.discord.com/hc/vi/articles/7924992471191-Y%C3%AAu-C%E1%BA%A7u-Tin-Nh%E1%BA%AFn).`
      )

    // Create modal
    const modalId = isAnonymous
      ? CUSTOM_ID.MODAL_CONFESSION_ANONYMOUS
      : CUSTOM_ID.MODAL_CONFESSION_NAMED

    const modalTitle = isAnonymous
      ? 'Gửi Confession Ẩn Danh'
      : 'Gửi Confession Công Khai'

    const modal = new ModalBuilder().setCustomId(modalId).setTitle(modalTitle)

    const contentInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_CONTENT)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Nhập nội dung bạn muốn chia sẻ...')
      .setMaxLength(3800)
      .setRequired(true)

    const contentLabel = new LabelBuilder()
      .setLabel('Nội dung Confession')
      .setTextInputComponent(contentInput)

    modal.addLabelComponents(contentLabel)

    await interaction.showModal(modal)
  }
}
