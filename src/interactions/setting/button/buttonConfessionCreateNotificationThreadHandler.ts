import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { SettingHelper } from '~/helpers/SettingHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

export class ButtonConfessionCreateNotificationThreadHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-confession-create-notification-thread') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    await SettingHelper.createNotificationThread({
      interaction,
      threadName: '💌 THÔNG BÁO CONFESSION 💌',
      oldThreadIdKey: 'confessionNotificationThreadId',
      updateKey: 'confessionNotificationThreadId',
      successMessage: 'Tạo kênh thông báo confession thành công'
    })
  })
}
