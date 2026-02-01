import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { createNotificationThread } from '~/helpers/SettingHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

export class ButtonTicketCreateNotificationThreadHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-ticket-create-notification-thread') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    await createNotificationThread({
      interaction,
      threadName: '🎟️ NƠI GỬI THÔNG BÁO HỖ TRỢ 🎟️',
      oldThreadIdKey: 'ticketNotificationThreadId',
      updateKey: 'ticketNotificationThreadId',
      successMessage: 'Tạo kênh thông báo hỗ trợ thành công'
    })
  })
}
