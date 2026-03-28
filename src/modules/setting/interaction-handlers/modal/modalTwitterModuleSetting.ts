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

    const weNmixxNotificationChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_WE_NMIXX_CHANNEL)
      ?.first()?.id

    const weNmixxNotificationRoleId = interaction.fields
      .getSelectedRoles(CUSTOM_ID.SELECT_SETTING_WE_NMIXX_ROLE)
      ?.first()?.id

    await SettingRepository.update(interaction.guild.id, {
      weNmixxNotificationChannelId,
      weNmixxNotificationRoleId
    })

    const formattedFields = formatFields([
      [
        'Kênh thông báo WE_NMIXX',
        weNmixxNotificationChannelId
          ? channelMention(weNmixxNotificationChannelId)
          : 'Không có'
      ],
      [
        'Role ping thông báo',
        weNmixxNotificationRoleId
          ? roleMention(weNmixxNotificationRoleId)
          : 'Không có'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật module Twitter thành công.',
      formattedFields
    )
  }
}
