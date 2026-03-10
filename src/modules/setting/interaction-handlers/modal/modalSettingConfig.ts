import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { GuildRepository } from '~/shared/repositories/guildRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalSettingConfig extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_CHANNEL_CONFIG)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const serviceForumChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_SERVICE_FORUM)
      ?.first()?.id

    const notificationForumChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_NOTIFICATION_FORUM)
      ?.first()?.id

    const confessionForumChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_CONFESSION_FORUM)
      ?.first()?.id

    const disbursementLogChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_DISBURSEMENT_LOG)
      ?.first()?.id

    const ticketCategoryId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_TICKET_CATEGORY)
      ?.first()?.id

    await GuildRepository.update(interaction.guild.id, {
      serviceForumChannelId,
      notificationForumChannelId,
      confessionForumChannelId,
      disbursementLogChannelId,
      ticketCategoryId
    })

    await InteractionUtil.replySuccess(
      interaction,
      'Cấu hình kênh đã được lưu thành công!'
    )
  }
}
