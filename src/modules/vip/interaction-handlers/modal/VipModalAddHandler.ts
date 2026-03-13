import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { VipType } from 'generated/prisma/client'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { VipService } from '../../services/VipService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class VipModalAddHandler extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_VIP_ADD) {
      return this.none()
    }
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    // Extract data using standard discord.js methods
    const selectedUsers = interaction.fields.getSelectedUsers(
      CUSTOM_ID.SELECT_VIP_ADD_USER
    )
    const typeValues = interaction.fields.getStringSelectValues(
      CUSTOM_ID.SELECT_VIP_ADD_TYPE
    )
    const durationValues = interaction.fields.getStringSelectValues(
      CUSTOM_ID.SELECT_VIP_ADD_DURATION
    )

    const userId = selectedUsers?.first()?.id
    const type = typeValues[0] as VipType
    const durationDays = durationValues[0]
      ? parseInt(durationValues[0])
      : undefined

    if (!userId) {
      return InteractionUtil.replyError(
        interaction,
        'Vui lòng chọn người dùng.'
      )
    }

    if (!type) {
      return InteractionUtil.replyError(interaction, 'Vui lòng chọn loại VIP.')
    }

    const guild = interaction.guild!
    const member = await guild.members.fetch(userId).catch(() => null)

    if (!member) {
      return InteractionUtil.replyError(
        interaction,
        'Không tìm thấy người dùng trong máy chủ.'
      )
    }

    const { expireAt, roleId } = await VipService.grantVip(
      member,
      type,
      durationDays
    )

    let successMessage = `Đã cấp quyền VIP cho ${member.toString()} thành công!`
    if (type === 'LIMITED' && expireAt) {
      successMessage += `\n- Hết hạn vào: <t:${Math.floor(expireAt.getTime() / 1000)}:F>`
    }
    successMessage += `\n- Role ID: \`${roleId}\``

    await InteractionUtil.replySuccess(interaction, successMessage)
  }
}
