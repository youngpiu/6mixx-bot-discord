import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

export class VipAddCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_VIP_ADD)
      .setTitle('Cấp quyền VIP')

    // 1. User Select
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_VIP_ADD_USER)
      .setPlaceholder('Chọn người dùng...')
      .setMinValues(1)
      .setMaxValues(1)

    const userLabel = new LabelBuilder()
      .setLabel('Người dùng')
      .setUserSelectMenuComponent(userSelect)

    // 2. Type Select
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_VIP_ADD_TYPE)
      .setPlaceholder('Chọn loại VIP...')
      .addOptions(
        { label: 'Vĩnh viễn', value: 'PERMANENT' },
        { label: 'Giới hạn', value: 'LIMITED' },
        { label: 'Nhà tài trợ (Booster)', value: 'BOOSTER' }
      )

    const typeLabel = new LabelBuilder()
      .setLabel('Loại VIP')
      .setStringSelectMenuComponent(typeSelect)

    // 3. Duration Select
    const durationSelect = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_VIP_ADD_DURATION)
      .setPlaceholder('Chọn thời hạn (nếu là Giới hạn)...')
      .addOptions(
        { label: '7 ngày', value: '7' },
        { label: '15 ngày', value: '15' },
        { label: '1 tháng', value: '30' },
        { label: '2 tháng', value: '60' },
        { label: '3 tháng', value: '90' },
        { label: '6 tháng', value: '180' },
        { label: '1 năm', value: '365' }
      )

    const durationLabel = new LabelBuilder()
      .setLabel('Thời hạn (Chỉ áp dụng cho loại Giới hạn)')
      .setStringSelectMenuComponent(durationSelect)

    modal.addLabelComponents(userLabel, typeLabel, durationLabel)

    await interaction.showModal(modal)
  }
}
