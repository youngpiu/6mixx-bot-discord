import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { HexColorString, ModalSubmitInteraction, Role } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { VipRepository } from '~/modules/vip/repositories/vipRepository'
import { VipService } from '~/modules/vip/services/VipService'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class VipModalCustomizationHandler extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (
      interaction.customId !== CUSTOM_ID.MODAL_VIP_EDIT_NAME &&
      interaction.customId !== CUSTOM_ID.MODAL_VIP_EDIT_COLOR &&
      interaction.customId !== CUSTOM_ID.MODAL_VIP_EDIT_ICON
    ) {
      return this.none()
    }
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const guildId = interaction.guildId!
    const userId = interaction.user.id

    const customRoleEntry = await VipRepository.findCustomRole(guildId, userId)
    if (!customRoleEntry || !customRoleEntry.roleId) {
      return InteractionUtil.replyError(
        interaction,
        'Không tìm thấy thông tin vai trò của bạn.'
      )
    }

    const role = await interaction.guild?.roles
      .fetch(customRoleEntry.roleId)
      .catch(() => null)
    if (!role) {
      return InteractionUtil.replyError(
        interaction,
        'Vai trò của bạn không tồn tại trong máy chủ. Có thể nó đã bị xóa.'
      )
    }

    switch (interaction.customId) {
      case CUSTOM_ID.MODAL_VIP_EDIT_NAME:
        return this.handleNameSubmit(interaction, role)
      case CUSTOM_ID.MODAL_VIP_EDIT_COLOR:
        return this.handleColorSubmit(interaction, role)
      case CUSTOM_ID.MODAL_VIP_EDIT_ICON:
        return this.handleIconSubmit(interaction, role)
    }
  }

  private async handleNameSubmit(
    interaction: ModalSubmitInteraction,
    role: Role
  ) {
    const name = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT_CONTENT)
    await VipService.updateRoleStyle(role, { name })
    await InteractionUtil.replySuccess(
      interaction,
      `Đã đổi tên vai trò thành: **${name}**`
    )
  }

  private async handleColorSubmit(
    interaction: ModalSubmitInteraction,
    role: Role
  ) {
    const primaryColor = interaction.fields.getTextInputValue('primary')
    let secondaryColor: string | undefined

    try {
      secondaryColor = interaction.fields.getTextInputValue('secondary')
    } catch {
      // If secondary field doesn't exist (guild doesn't support enhanced)
    }

    // Basic HEX validation
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (
      !hexRegex.test(primaryColor) ||
      (secondaryColor &&
        secondaryColor !== '#' &&
        !hexRegex.test(secondaryColor))
    ) {
      return InteractionUtil.replyError(
        interaction,
        'Mã màu HEX không hợp lệ (Ví dụ: #FFFFFF).'
      )
    }

    await VipService.updateRoleStyle(role, {
      colors: {
        primaryColor: primaryColor as HexColorString,
        secondaryColor: (secondaryColor === '#'
          ? undefined
          : secondaryColor) as HexColorString
      }
    })
    await InteractionUtil.replySuccess(
      interaction,
      'Đã cập nhật màu sắc vai trò thành công!'
    )
  }

  private async handleIconSubmit(
    interaction: ModalSubmitInteraction,
    role: Role
  ) {
    const files = interaction.fields.getUploadedFiles(CUSTOM_ID.INPUT_CONTENT)
    if (!files || files.size === 0) {
      return InteractionUtil.replyError(
        interaction,
        'Vui lòng tải lên một tệp tin hình ảnh.'
      )
    }

    const firstFile = files.first()

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (
      !firstFile?.contentType ||
      !allowedTypes.includes(firstFile.contentType)
    ) {
      throw new NormalError(
        'Tệp tin không hợp lệ, chỉ chấp nhận ảnh PNG, JPG, JPEG.'
      )
    }

    const MAX_SIZE = 2 * 1024 * 1024 // 2 MB — giới hạn thực tế Discord cho role icon
    if (firstFile.size > MAX_SIZE) {
      throw new NormalError(
        `Ảnh quá lớn (${(firstFile.size / 1024).toFixed(0)} KB), vui lòng chọn ảnh nhỏ hơn 2 MB.`
      )
    }

    const iconUrl = firstFile.url || firstFile.proxyURL
    if (!iconUrl)
      return InteractionUtil.replyError(
        interaction,
        'Không thể lấy URL hình ảnh.'
      )

    await VipService.updateRoleStyle(role, { icon: iconUrl })
    await InteractionUtil.replySuccess(
      interaction,
      'Đã cập nhật biểu tượng vai trò thành công!'
    )
  }
}
