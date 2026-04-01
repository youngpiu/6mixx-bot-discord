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
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'

import { SettingHelper } from '~/modules/setting/helpers/SettingHelper'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonBubbleModuleSetting extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_BUBBLE_MODULE)
      return this.none()

    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    return this.some({ guildConfig })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { guildConfig } = result

    const labelBubbleCategory = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.bubbleIdolCategoryId,
      customId: CUSTOM_ID.SELECT_SETTING_BUBBLE_CATEGORY,
      channelType: ChannelType.GuildCategory,
      label: 'Danh mục chứa các kênh idol',
      required: true,
      placeholders: {
        channelConfiguredAndExists: 'Chọn danh mục chứa các kênh idol',
        channelConfiguredButDeleted: 'Danh mục đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập danh mục chứa kênh idol',
        noChannelsInServer: 'Không có danh mục nào trong server'
      }
    })

    const xUsernameInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_SETTING_BUBBLE_X_USERNAME)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('@6mixxbbl hoặc 6mixxbbl')
      .setRequired(true)

    if (guildConfig?.bubbleXUsername) {
      xUsernameInput.setValue(guildConfig.bubbleXUsername)
    }

    const labelXUsername = new LabelBuilder()
      .setLabel('Username account X Bubble lậu (global)')
      .setTextInputComponent(xUsernameInput)

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_BUBBLE_MODULE)
      .setTitle('Cài đặt tính năng Bubble')
      .addLabelComponents(labelBubbleCategory, labelXUsername)

    await interaction.showModal(modal)
  }
}
