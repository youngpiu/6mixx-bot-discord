import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'
import { channelMention } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { formatFields } from '~/shared/utils/textUtil'

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

    await SettingRepository.update(interaction.guild.id, {
      serviceForumChannelId,
      notificationForumChannelId,
      confessionForumChannelId,
      disbursementLogChannelId,
      ticketCategoryId
    })

    const formattedFields = formatFields([
      [
        'Kênh dịch vụ',
        serviceForumChannelId
          ? channelMention(serviceForumChannelId)
          : 'Không có'
      ],
      [
        'Kênh thông báo',
        notificationForumChannelId
          ? channelMention(notificationForumChannelId)
          : 'Không có'
      ],
      [
        'Kênh đăng confession',
        confessionForumChannelId
          ? channelMention(confessionForumChannelId)
          : 'Không có'
      ],
      [
        'Kênh sao kê khoản chi',
        disbursementLogChannelId
          ? channelMention(disbursementLogChannelId)
          : 'Không có'
      ],
      [
        'Danh mục chứa phiếu/kênh hỗ trợ',
        ticketCategoryId ? channelMention(ticketCategoryId) : 'Không có'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật cấu hình thành công.',
      formattedFields
    )
  }
}
