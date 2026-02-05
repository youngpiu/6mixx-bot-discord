import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import {
  ButtonInteraction,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { hasAdministratorPermission } from '~/utils/permissionUtil'

export class ButtonTicketCloseWithReasonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (
      interaction.customId !== 'btn-ticket-close-reason' ||
      !hasAdministratorPermission(interaction)
    )
      return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    if (!interaction.guildId) return

    const modal = new ModalBuilder()
      .setCustomId('modal-ticket-close-reason')
      .setTitle('Đóng phiếu hỗ trợ')

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
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
  })
}
