import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction, roleMention } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { formatFields } from '~/shared/utils/textUtil'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalTwitterModuleSetting extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_SNS_NOTIFICATION_ROLES)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const snsYouTubeRoleId = interaction.fields
      .getSelectedRoles(CUSTOM_ID.SELECT_SETTING_SNS_YOUTUBE_ROLE)
      ?.first()?.id

    const snsTwitterRoleId = interaction.fields
      .getSelectedRoles(CUSTOM_ID.SELECT_SETTING_SNS_TWITTER_ROLE)
      ?.first()?.id

    const snsInstagramRoleId = interaction.fields
      .getSelectedRoles(CUSTOM_ID.SELECT_SETTING_SNS_INSTAGRAM_ROLE)
      ?.first()?.id

    const snsAllowedRoleIds =
      interaction.fields
        .getSelectedRoles(CUSTOM_ID.SELECT_SETTING_SNS_ALLOWED_ROLES)
        ?.map((role) => role?.id)
        .filter((id): id is string => !!id) || []

    await SettingRepository.update(interaction.guild.id, {
      snsYouTubeRoleId,
      snsTwitterRoleId,
      snsInstagramRoleId,
      snsAllowedRoleIds
    })

    const formattedFields = formatFields([
      [
        'Role ping thông báo YouTube',
        snsYouTubeRoleId ? roleMention(snsYouTubeRoleId) : 'Không có'
      ],
      [
        'Role ping thông báo Twitter',
        snsTwitterRoleId ? roleMention(snsTwitterRoleId) : 'Không có'
      ],
      [
        'Role ping thông báo Instagram',
        snsInstagramRoleId ? roleMention(snsInstagramRoleId) : 'Không có'
      ],
      [
        'Role được phép dùng lệnh notification',
        snsAllowedRoleIds.length > 0
          ? snsAllowedRoleIds.map((id) => roleMention(id)).join(', ')
          : 'Không có'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật vai trò tính năng thông báo SNS thành công.',
      formattedFields
    )
  }
}
