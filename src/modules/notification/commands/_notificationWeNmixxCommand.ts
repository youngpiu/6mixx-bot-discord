import {
  ChatInputCommandInteraction,
  GuildMember,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'

const MEMBERS = [
  'Haewon',
  'Lily',
  'Sullyoon',
  'Bae',
  'Jiwoo',
  'Kyujin'
] as const

export class NotificationWeNmixxCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return

    const guildConfig = await SettingRepository.find(interaction.guildId)
    const allowedRoleIds = guildConfig?.weNmixxNotificationAllowedRoleIds || []

    const member = interaction.member as GuildMember
    const hasAllowedRole =
      allowedRoleIds.length > 0 &&
      member.roles.cache.some((role) => allowedRoleIds.includes(role.id))

    if (!hasAllowedRole) {
      return interaction.reply({
        content:
          allowedRoleIds.length > 0
            ? 'Bạn không có vai trò được phép sử dụng lệnh này.'
            : 'Bạn không có quyền sử dụng lệnh này (Yêu cầu Administrator).',
        flags: ['Ephemeral']
      })
    }

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_WE_NMIXX)
      .setTitle('Đăng bài WE_NMIXX')

    const urlInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_WE_NMIXX_URL)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://x.com/WE_NMIXX/status/...')
      .setRequired(true)

    const urlLabel = new LabelBuilder()
      .setLabel('Đường dẫn X/Twitter')
      .setTextInputComponent(urlInput)

    const memberSelect = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_WE_NMIXX_MEMBER)
      .setPlaceholder('Chọn thành viên NMIXX')
      .setRequired(true)
      .addOptions(
        ...MEMBERS.map((m) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(m)
            .setValue(m)
            .setDescription(`Webhook của ${m}`)
        )
      )

    const memberLabel = new LabelBuilder()
      .setLabel('Thành viên NMIXX')
      .setStringSelectMenuComponent(memberSelect)

    const descInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_WE_NMIXX_DESC)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(
        'Nhập nội dung đã dịch để thay thế bài gốc (không bắt buộc)'
      )
      .setRequired(false)

    const descLabel = new LabelBuilder()
      .setLabel('Mô tả dịch (Tuỳ chọn)')
      .setTextInputComponent(descInput)

    modal.addLabelComponents(urlLabel, memberLabel, descLabel)

    return interaction.showModal(modal)
  }
}
