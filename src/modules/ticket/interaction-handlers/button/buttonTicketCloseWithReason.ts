import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

export class ButtonTicketCloseWithReason extends InteractionHandler {
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
    if (
      interaction.customId !== CUSTOM_ID.BTN_TICKET_CLOSE_REASON ||
      !interaction.memberPermissions?.has('Administrator')
    )
      return this.none()
    return this.some()
  }

  public async run(interaction: ButtonInteraction) {
    if (!interaction || !interaction.guild) return

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_TICKET_CLOSE_REASON)
      .setTitle('Đóng phiếu hỗ trợ')

    const reasonInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_REASON)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Nhập lý do đóng phiếu hỗ trợ...')
      .setMaxLength(500)
      .setRequired(true)

    const reasonLabel = new LabelBuilder()
      .setLabel('Lý do đóng')
      .setDescription('Mô tả lý do bạn đóng phiếu hỗ trợ này.')
      .setTextInputComponent(reasonInput)

    modal.addLabelComponents(reasonLabel)

    await interaction.showModal(modal)
  }
}
