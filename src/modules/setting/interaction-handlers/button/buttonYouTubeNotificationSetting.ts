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
export class ButtonYouTubeNotificationSetting extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_YOUTUBE_NOTIFICATION)
      return this.none()

    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    return this.some({ guildConfig })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { guildConfig } = result

    const labelListenChannel = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.youtubeNotificationListenChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_YOUTUBE_LISTEN_CHANNEL,
      channelType: ChannelType.GuildText,
      label: 'Kênh nhận link youtube',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh nhận link youtube',
        channelConfiguredButDeleted: 'Kênh đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh nhận link youtube',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const labelPostChannel = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.youtubeNotificationPostChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_YOUTUBE_POST_CHANNEL,
      channelType: ChannelType.GuildText,
      label: 'Kênh phát thông báo youtube',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh phát thông báo youtube',
        channelConfiguredButDeleted: 'Kênh đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh phát thông báo youtube',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_SETTING_YOUTUBE_ROLE)
      .setPlaceholder('Chọn role để ping...')
      .setMinValues(1)
      .setMaxValues(1)

    if (guildConfig?.youtubeNotificationRoleId) {
      roleSelect.setDefaultRoles(guildConfig.youtubeNotificationRoleId)
    }

    const labelRole = new LabelBuilder()
      .setLabel('Role để ping ở kênh phát thông báo')
      .setRoleSelectMenuComponent(roleSelect)

    const allowedRolesSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_SETTING_YOUTUBE_ALLOWED_ROLES)
      .setPlaceholder('Chọn các role được phép gửi link youtube...')
      .setMinValues(0)
      .setMaxValues(25)

    if (guildConfig?.youtubeNotificationAllowedRoleIds?.length) {
      allowedRolesSelect.setDefaultRoles(
        guildConfig.youtubeNotificationAllowedRoleIds
      )
    }

    const labelAllowedRoles = new LabelBuilder()
      .setLabel(
        'Role được phép gửi link youtube (để trống nếu cho phép tất cả)'
      )
      .setRoleSelectMenuComponent(allowedRolesSelect)

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_YOUTUBE_NOTIFICATION)
      .setTitle('Cài đặt thông báo Youtube')
      .addLabelComponents(
        labelListenChannel,
        labelPostChannel,
        labelRole,
        labelAllowedRoles
      )

    await interaction.showModal(modal)
  }
}
