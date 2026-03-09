// Handler for general guild channel settings modal submissions
import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { GuildRepository } from '~/shared/repositories/guildRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { lines } from '~/shared/utils/textUtil'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalChannelSetting extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_CHANNEL_SETTING)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction || !interaction.guild) return

    const serviceForumChannelId = interaction.fields
      .getSelectedChannels('select-service-channel')
      ?.first()?.id
    const notificationForumChannelId = interaction.fields
      .getSelectedChannels('select-notification-channel')
      ?.first()?.id

    await GuildRepository.update(interaction.guild.id, {
      serviceForumChannelId,
      notificationForumChannelId
    })

    await InteractionUtil.replySuccess(
      interaction,
      'Bạn đã cập nhật thành công các kênh trong **Cài đặt chung**.',
      lines(
        `- **Kênh dịch vụ:** ${serviceForumChannelId ? `<#${serviceForumChannelId}>.` : '*Chưa thiết lập*.'}`,
        `- **Kênh thông báo:** ${notificationForumChannelId ? `<#${notificationForumChannelId}>.` : '*Chưa thiết lập*.'}`
      )
    )
  }
}
