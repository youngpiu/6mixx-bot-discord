import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalSettingVipAnchor extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_VIP_ANCHOR) {
      return this.none()
    }
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const roles = interaction.fields.getSelectedRoles(
      CUSTOM_ID.SELECT_SETTING_VIP_ANCHOR_ROLE
    )
    const roleId = roles?.firstKey()

    if (!roleId) {
      return InteractionUtil.replyError(
        interaction,
        'Vui lòng chọn một vai trò.'
      )
    }

    const guildId = interaction.guildId!

    await SettingRepository.update(guildId, {
      vipAnchorRoleId: roleId
    })

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật thành công',
      `Vai trò neo cho VIP đã được đặt thành: <@&${roleId}>`
    )
  }
}
