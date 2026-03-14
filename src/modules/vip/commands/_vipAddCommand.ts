import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

export class VipAddCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_VIP_ADD)
      .setTitle('Cấp vai trò VIP')

    // 1. User Select
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_VIP_ADD_USER)
      .setPlaceholder('Chọn thành viên muốn cấp vai trò VIP...')
      .setMinValues(1)
      .setMaxValues(1)

    const userLabel = new LabelBuilder()
      .setLabel('Thành viên')
      .setUserSelectMenuComponent(userSelect)

    // 2. Type Select
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_VIP_ADD_TYPE)
      .setPlaceholder('Chọn loại vai trò VIP...')
      .addOptions(
        { label: 'Vĩnh viễn', value: 'PERMANENT' },
        { label: 'Giới hạn', value: 'LIMITED' },
        { label: 'Booster', value: 'BOOSTER' }
      )

    const typeLabel = new LabelBuilder()
      .setLabel('Loại vai trò VIP')
      .setStringSelectMenuComponent(typeSelect)

    // 3. Duration Select
    const durationSelect = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_VIP_ADD_DURATION)
      .setPlaceholder('Chọn thời hạn (nếu là loại Giới hạn)...')
      .addOptions(
        { label: '1 ngày', value: '1' },
        { label: '3 ngày', value: '3' },
        { label: '7 ngày', value: '7' },
        { label: '14 ngày', value: '14' },
        { label: '1 tháng', value: '30' },
        { label: '2 tháng', value: '60' },
        { label: '3 tháng', value: '90' },
        { label: '6 tháng', value: '180' },
        { label: '1 năm', value: '365' }
      )

    const durationLabel = new LabelBuilder()
      .setLabel('Thời hạn')
      .setStringSelectMenuComponent(durationSelect)

    // 4. Role Select
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_VIP_ADD_ROLE)
      .setPlaceholder('Chọn vai trò đã có (Tuỳ chọn)')
      .setMaxValues(1)
      .setRequired(false)

    const roleLabel = new LabelBuilder()
      .setLabel('Vai trò VIP (Bỏ qua nếu muốn bot tạo mới)')
      .setRoleSelectMenuComponent(roleSelect)

    modal.addLabelComponents(userLabel, typeLabel, durationLabel, roleLabel)

    await interaction.showModal(modal)
  }
}
