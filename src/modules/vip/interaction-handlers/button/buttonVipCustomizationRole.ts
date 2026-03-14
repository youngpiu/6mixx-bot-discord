import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  Role,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

import { VipRepository } from '~/modules/vip/repositories/vipRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonVipCustomizationRole extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (
      interaction.customId !== CUSTOM_ID.BTN_VIP_EDIT_NAME &&
      interaction.customId !== CUSTOM_ID.BTN_VIP_EDIT_COLOR &&
      interaction.customId !== CUSTOM_ID.BTN_VIP_EDIT_ICON
    ) {
      return this.none()
    }

    const guildId = interaction.guildId!
    const userId = interaction.user.id

    // Check if user has a VIP status or custom role
    const customRole = await VipRepository.findCustomRole(guildId, userId)
    if (!customRole || !customRole.roleId) {
      return this.some({
        error: 'Vui lòng sở hữu vai trò VIP trước khi sử dụng chức năng này.'
      })
    }

    const role = await interaction.guild?.roles
      .fetch(customRole.roleId)
      .catch(() => null)
    if (!role) {
      return this.some({
        error:
          'Vai trò VIP của bạn không tồn tại, vui lòng liên hệ **Ban quản lý**.'
      })
    }

    return this.some({ role })
  }

  public async run(
    interaction: ButtonInteraction,
    data: { role?: Role; error?: string }
  ) {
    if (data.error) {
      throw new NormalError(data.error)
    }

    const { role } = data
    if (!role) return

    switch (interaction.customId) {
      case CUSTOM_ID.BTN_VIP_EDIT_NAME:
        return this.handleEditName(interaction, role.name)
      case CUSTOM_ID.BTN_VIP_EDIT_COLOR:
        return this.handleEditColor(
          interaction,
          this.toHexColor(role.colors?.primaryColor) ??
            role.hexColor ??
            '#FFFFFF',
          this.toHexColor(role.colors?.secondaryColor) ?? '#000000'
        )
      case CUSTOM_ID.BTN_VIP_EDIT_ICON:
        return this.handleEditIcon(interaction)
    }
  }

  private async handleEditName(
    interaction: ButtonInteraction,
    currentName: string
  ) {
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_VIP_EDIT_NAME)
      .setTitle('Đổi tên vai trò VIP')

    const input = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_CONTENT)
      .setPlaceholder('Nhập tên vai trò bạn muốn...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(32)
      .setValue(currentName)

    const label = new LabelBuilder()
      .setLabel('Tên vai trò mới')
      .setDescription('Tên hiển thị của vai trò VIP của bạn.')
      .setTextInputComponent(input)

    modal.addLabelComponents(label)
    await interaction.showModal(modal)
  }

  private toHexColor(color: number | null | undefined): string | null {
    if (color == null || color === 0) return null
    return `#${color.toString(16).padStart(6, '0').toUpperCase()}`
  }

  private async handleEditColor(
    interaction: ButtonInteraction,
    currentP: string,
    currentS: string
  ) {
    const hasEnhanced = (interaction.guild?.features as string[]).includes(
      'ENHANCED_ROLE_COLORS'
    )

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_VIP_EDIT_COLOR)
      .setTitle('Đổi màu vai trò VIP')

    const primaryInput = new TextInputBuilder()
      .setCustomId('primary')
      .setPlaceholder('#FFFFFF')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(7)
      .setMaxLength(7)
      .setValue(currentP)

    const primaryLabel = new LabelBuilder()
      .setLabel('Màu chính')
      .setDescription('Mã màu HEX (ví dụ: #FFFFFF)')
      .setTextInputComponent(primaryInput)

    modal.addLabelComponents(primaryLabel)

    if (hasEnhanced) {
      const secondaryInput = new TextInputBuilder()
        .setCustomId('secondary')
        .setPlaceholder('#000000')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMinLength(7)
        .setMaxLength(7)
        .setValue(currentS)

      const secondaryLabel = new LabelBuilder()
        .setLabel('Màu phụ')
        .setDescription('Kết hợp với màu chính để tạo ra màu gradient.')
        .setTextInputComponent(secondaryInput)

      modal.addLabelComponents(secondaryLabel)
    }

    await interaction.showModal(modal)
  }

  private async handleEditIcon(interaction: ButtonInteraction) {
    const hasIcons = (interaction.guild?.features as string[]).includes(
      'ROLE_ICONS'
    )
    if (!hasIcons) {
      throw new NormalError(
        'Máy chủ của bạn chưa hỗ trợ biểu tượng vai trò (Yêu cầu Level 2 Boost).'
      )
    }

    const iconUpload = new FileUploadBuilder()
      .setCustomId(CUSTOM_ID.INPUT_CONTENT)
      .setMinValues(1)
      .setMaxValues(1)
      .setRequired(true)

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_VIP_EDIT_ICON)
      .setTitle('Đổi biểu tượng vai trò VIP')

    const label = new LabelBuilder()
      .setLabel('Biểu tượng')
      .setDescription(
        'Tải lên tệp tin hình ảnh làm biểu tượng (ảnh có dung lượng tối đa 2MB).'
      )
      .setFileUploadComponent(iconUpload)

    modal.addLabelComponents(label)
    await interaction.showModal(modal)
  }
}
