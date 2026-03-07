import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'

import { InteractionUtil } from '~/utils/messageUtil'
import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class ModalChannelSettingHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_CHANNEL_SETTING) return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guildId) return

    const serviceForumChannelId = interaction.fields
      .getSelectedChannels('select-service-channel')
      ?.first()?.id
    const notificationForumChannelId = interaction.fields
      .getSelectedChannels('select-notification-channel')
      ?.first()?.id

    await GuildRepository.updateConfig(interaction.guildId, {
      serviceForumChannelId,
      notificationForumChannelId
    })

    await InteractionUtil.replySuccess(
      interaction,
      'Bạn đã cập nhật thành công các kênh trong **Cài đặt chung**.',
      lines(
        `- **Kênh dịch vụ:** ${serviceForumChannelId ? `<#${serviceForumChannelId}>` : '*Chưa thiết lập*'}`,
        `- **Kênh thông báo:** ${notificationForumChannelId ? `<#${notificationForumChannelId}>` : '*Chưa thiết lập*'}`
      )
    )
  }
}
