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
export class ModalInstagramModuleSetting extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_INSTAGRAM_MODULE)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const instagramNotificationChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_INSTAGRAM_CHANNEL)
      ?.first()?.id

    const instagramNotificationRoleId = interaction.fields
      .getSelectedRoles(CUSTOM_ID.SELECT_SETTING_INSTAGRAM_ROLE)
      ?.first()?.id

    const instagramNotificationAllowedRoleIds =
      interaction.fields
        .getSelectedRoles(CUSTOM_ID.SELECT_SETTING_INSTAGRAM_ALLOWED_ROLES)
        ?.map((role) => role?.id)
        .filter((id): id is string => !!id) || []

    await SettingRepository.update(interaction.guild.id, {
      instagramNotificationChannelId,
      instagramNotificationRoleId,
      instagramNotificationAllowedRoleIds
    })

    const formattedFields = formatFields([
      [
        'Kênh thông báo Instagram',
        instagramNotificationChannelId
          ? channelMention(instagramNotificationChannelId)
          : 'Không có'
      ],
      [
        'Role ping thông báo',
        instagramNotificationRoleId
          ? roleMention(instagramNotificationRoleId)
          : 'Không có'
      ],
      [
        'Role được phép dùng lệnh',
        instagramNotificationAllowedRoleIds.length > 0
          ? instagramNotificationAllowedRoleIds
              .map((id) => roleMention(id))
              .join(', ')
          : 'Mặc định (Admin)'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật module Instagram thành công.',
      formattedFields
    )
  }
}
