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
export class ButtonTwitterModuleSetting extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_TWITTER_MODULE)
      return this.none()

    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    return this.some({ guildConfig })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { guildConfig } = result

    const labelWeNmixxChannel = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.weNmixxNotificationChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_WE_NMIXX_CHANNEL,
      channelType: ChannelType.GuildAnnouncement,
      label: 'Kênh thông báo WE_NMIXX',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh thông báo WE_NMIXX',
        channelConfiguredButDeleted: 'Kênh đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh thông báo WE_NMIXX',
        noChannelsInServer: 'Không có kênh thông báo nào'
      }
    })

    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_SETTING_WE_NMIXX_ROLE)
      .setPlaceholder('Chọn role để ping thông báo...')
      .setMinValues(0)
      .setMaxValues(1)
      .setRequired(false)

    if (guildConfig?.weNmixxNotificationRoleId) {
      roleSelect.setDefaultRoles(guildConfig.weNmixxNotificationRoleId)
    }

    const labelRole = new LabelBuilder()
      .setLabel('Role ping thông báo (Không bắt buộc)')
      .setRoleSelectMenuComponent(roleSelect)

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_TWITTER_MODULE)
      .setTitle('Cài đặt module Twitter')
      .addLabelComponents(labelWeNmixxChannel, labelRole)

    await interaction.showModal(modal)
  }
}
