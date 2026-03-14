import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
  LabelBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonVipSettingAnchorRole extends InteractionHandler {
  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_VIP_ANCHOR) {
      return this.none()
    }
    return this.some()
  }

  public async run(interaction: ButtonInteraction) {
    const guildId = interaction.guildId!
    const setting = await SettingRepository.find(guildId)

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_VIP_ANCHOR)
      .setTitle('Cài đặt vai trò neo')

    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_SETTING_VIP_ANCHOR_ROLE)
      .setPlaceholder('Chọn vai trò neo...')
      .setMinValues(1)
      .setMaxValues(1)

    if (setting?.vipAnchorRoleId) {
      roleSelect.setDefaultRoles(setting.vipAnchorRoleId)
    }

    const label = new LabelBuilder()
      .setLabel('Vai trò neo')
      .setDescription('Các vai trò VIP sẽ được tạo ngay bên dưới vai trò này.')
      .setRoleSelectMenuComponent(roleSelect)

    modal.addLabelComponents(label)

    await interaction.showModal(modal)
  }
}
