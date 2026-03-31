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
export class ButtonTwitterModuleSetting extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_SNS_NOTIFICATION_ROLES)
      return this.none()

    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    return this.some({ guildConfig })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { guildConfig } = result

    const youtubeRoleSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_SETTING_SNS_YOUTUBE_ROLE)
      .setPlaceholder('Chọn role để ping thông báo...')
      .setMinValues(0)
      .setMaxValues(1)
      .setRequired(false)

    if (guildConfig?.snsYouTubeRoleId) {
      youtubeRoleSelect.setDefaultRoles(guildConfig.snsYouTubeRoleId)
    }

    const labelYoutubeRole = new LabelBuilder()
      .setLabel('Role ping thông báo YouTube')
      .setRoleSelectMenuComponent(youtubeRoleSelect)

    const twitterRoleSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_SETTING_SNS_TWITTER_ROLE)
      .setPlaceholder('Chọn role để ping thông báo...')
      .setMinValues(0)
      .setMaxValues(1)
      .setRequired(false)

    if (guildConfig?.snsTwitterRoleId) {
      twitterRoleSelect.setDefaultRoles(guildConfig.snsTwitterRoleId)
    }

    const labelTwitterRole = new LabelBuilder()
      .setLabel('Role ping thông báo Twitter')
      .setRoleSelectMenuComponent(twitterRoleSelect)

    const instagramRoleSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_SETTING_SNS_INSTAGRAM_ROLE)
      .setPlaceholder('Chọn role để ping thông báo...')
      .setMinValues(0)
      .setMaxValues(1)
      .setRequired(false)

    if (guildConfig?.snsInstagramRoleId) {
      instagramRoleSelect.setDefaultRoles(guildConfig.snsInstagramRoleId)
    }

    const labelInstagramRole = new LabelBuilder()
      .setLabel('Role ping thông báo Instagram')
      .setRoleSelectMenuComponent(instagramRoleSelect)

    const allowedRolesSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_SETTING_SNS_ALLOWED_ROLES)
      .setPlaceholder('Chọn role được phép dùng lệnh /notification...')
      .setMinValues(0)
      .setMaxValues(25)
      .setRequired(false)

    if (guildConfig?.snsAllowedRoleIds?.length) {
      allowedRolesSelect.setDefaultRoles(...guildConfig.snsAllowedRoleIds)
    }

    const labelAllowedRoles = new LabelBuilder()
      .setLabel('Role được phép dùng lệnh notification')
      .setRoleSelectMenuComponent(allowedRolesSelect)

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_SNS_NOTIFICATION_ROLES)
      .setTitle('Cài đặt vai trò thông báo SNS')
      .addLabelComponents(
        labelYoutubeRole,
        labelTwitterRole,
        labelInstagramRole,
        labelAllowedRoles
      )

    await interaction.showModal(modal)
  }
}
