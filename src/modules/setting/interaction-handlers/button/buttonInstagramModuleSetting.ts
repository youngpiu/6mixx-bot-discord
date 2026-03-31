import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
  ChannelType,
  LabelBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'

import { SettingHelper } from '~/modules/setting/helpers/SettingHelper'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonInstagramModuleSetting extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_INSTAGRAM_MODULE)
      return this.none()

    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    return this.some({ guildConfig })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { guildConfig } = result

    const labelInstagramChannel = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.instagramNotificationChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_INSTAGRAM_CHANNEL,
      channelType: ChannelType.GuildAnnouncement,
      label: 'Kênh thông báo Instagram',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh thông báo Instagram',
        channelConfiguredButDeleted: 'Kênh đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh thông báo Instagram',
        noChannelsInServer: 'Không có kênh thông báo nào'
      }
    })

    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_SETTING_INSTAGRAM_ROLE)
      .setPlaceholder('Chọn role để ping thông báo...')
      .setMinValues(0)
      .setMaxValues(1)
      .setRequired(false)

    if (guildConfig?.instagramNotificationRoleId) {
      roleSelect.setDefaultRoles(guildConfig.instagramNotificationRoleId)
    }

    const labelRole = new LabelBuilder()
      .setLabel('Role ping thông báo (Không bắt buộc)')
      .setRoleSelectMenuComponent(roleSelect)

    const allowedRolesSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_SETTING_INSTAGRAM_ALLOWED_ROLES)
      .setPlaceholder(
        'Chọn role được phép dùng lệnh /notification instagram...'
      )
      .setMinValues(0)
      .setMaxValues(25)
      .setRequired(false)

    if (guildConfig?.instagramNotificationAllowedRoleIds?.length) {
      allowedRolesSelect.setDefaultRoles(
        ...guildConfig.instagramNotificationAllowedRoleIds
      )
    }

    const labelAllowedRoles = new LabelBuilder()
      .setLabel('Role được phép dùng lệnh (Mặc định: Admin)')
      .setRoleSelectMenuComponent(allowedRolesSelect)

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_INSTAGRAM_MODULE)
      .setTitle('Cài đặt module Instagram')
      .addLabelComponents(labelInstagramChannel, labelRole, labelAllowedRoles)

    await interaction.showModal(modal)
  }
}
