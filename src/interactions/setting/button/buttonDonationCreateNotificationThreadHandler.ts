import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction } from 'discord.js'

import { SettingHelper } from '~/helpers/SettingHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

export class ButtonDonationCreateNotificationThreadHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-donation-create-notification-thread') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    await SettingHelper.createNotificationThread({
      interaction,
      threadName: '💸 THÔNG BÁO QUYÊN GÓP 💸',
      oldThreadIdKey: 'donationNotificationThreadId',
      updateKey: 'donationNotificationThreadId',
      successMessage: 'Kênh thông báo quyên góp đã được tạo'
    })
  })
}
