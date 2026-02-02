import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { SettingHelper } from '~/helpers/SettingHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

export class ButtonGeneralCreateErrorNotificationThreadHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-general-create-error-notification-thread') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    await SettingHelper.createNotificationThread({
      interaction,
      threadName: '⚠️ THÔNG BÁO LỖI BOT ⚠️',
      oldThreadIdKey: 'errorNotificationThreadId',
      updateKey: 'errorNotificationThreadId',
      successMessage: 'Kênh thông báo lỗi đã được tạo'
    })
  })
}
