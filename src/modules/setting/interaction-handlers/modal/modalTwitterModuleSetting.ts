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
export class ModalTwitterModuleSetting extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_TWITTER_MODULE)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const twitterNotificationChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_TWITTER_CHANNEL)
      ?.first()?.id

    const twitterNotificationRoleId = interaction.fields
      .getSelectedRoles(CUSTOM_ID.SELECT_SETTING_TWITTER_ROLE)
      ?.first()?.id

    const twitterNotificationAllowedRoleIds =
      interaction.fields
        .getSelectedRoles(CUSTOM_ID.SELECT_SETTING_TWITTER_ALLOWED_ROLES)
        ?.map((role) => role?.id)
        .filter((id): id is string => !!id) || []

    await SettingRepository.update(interaction.guild.id, {
      twitterNotificationChannelId,
      twitterNotificationRoleId,
      twitterNotificationAllowedRoleIds
    })

    const formattedFields = formatFields([
      [
        'Kênh thông báo Twitter',
        twitterNotificationChannelId
          ? channelMention(twitterNotificationChannelId)
          : 'Không có'
      ],
      [
        'Role ping thông báo',
        twitterNotificationRoleId
          ? roleMention(twitterNotificationRoleId)
          : 'Không có'
      ],
      [
        'Role được phép dùng lệnh',
        twitterNotificationAllowedRoleIds.length > 0
          ? twitterNotificationAllowedRoleIds
              .map((id) => roleMention(id))
              .join(', ')
          : 'Mặc định (Admin)'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật module Twitter thành công.',
      formattedFields
    )
  }
}
