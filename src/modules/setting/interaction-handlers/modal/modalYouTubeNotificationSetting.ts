import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction, channelMention, roleMention } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { formatFields } from '~/shared/utils/textUtil'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalYouTubeNotificationSetting extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_YOUTUBE_NOTIFICATION)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const youtubeNotificationListenChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_YOUTUBE_LISTEN_CHANNEL)
      ?.first()?.id

    const youtubeNotificationPostChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_YOUTUBE_POST_CHANNEL)
      ?.first()?.id

    const youtubeNotificationRoleId = interaction.fields
      .getSelectedRoles(CUSTOM_ID.SELECT_SETTING_YOUTUBE_ROLE)
      ?.first()?.id

    const youtubeNotificationAllowedRoleIds =
      interaction.fields
        .getSelectedRoles(CUSTOM_ID.SELECT_SETTING_YOUTUBE_ALLOWED_ROLES)
        ?.filter((role) => !!role)
        .map((role) => role!.id) || []

    await SettingRepository.update(interaction.guild.id, {
      youtubeNotificationListenChannelId,
      youtubeNotificationPostChannelId,
      youtubeNotificationRoleId,
      youtubeNotificationAllowedRoleIds
    })

    const formattedFields = formatFields([
      [
        'Kênh nhận link',
        youtubeNotificationListenChannelId
          ? channelMention(youtubeNotificationListenChannelId)
          : 'Không có'
      ],
      [
        'Kênh phát thông báo',
        youtubeNotificationPostChannelId
          ? channelMention(youtubeNotificationPostChannelId)
          : 'Không có'
      ],
      [
        'Role để ping',
        youtubeNotificationRoleId
          ? roleMention(youtubeNotificationRoleId)
          : 'Không có'
      ],
      [
        'Role được phép gửi link',
        youtubeNotificationAllowedRoleIds.length > 0
          ? youtubeNotificationAllowedRoleIds
              .map((id) => roleMention(id))
              .join(', ')
          : 'Cho phép tất cả'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật cấu hình thông báo Youtube thành công.',
      formattedFields
    )
  }
}
