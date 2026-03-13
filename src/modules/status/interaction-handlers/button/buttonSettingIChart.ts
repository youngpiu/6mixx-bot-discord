import { ApplyOptions, RequiresGuildContext } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ButtonInteraction,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'

/**
 * Interaction handler for the iChart configuration button in the settings menu.
 * When clicked, it opens a modal for the user to configure the song ID and display name.
 */
@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonSettingIChart extends InteractionHandler {
  /**
   * Checks if this handler should process the given button interaction.
   * @param interaction - The button interaction to parse.
   * @returns A "some" result with the current guild configuration if matched, otherwise "none".
   */
  @RequiresGuildContext()
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_ICHART_CONFIG)
      return this.none()

    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    return this.some({ guildConfig })
  }

  /**
   * Executes the handler logic.
   * Builds and shows a modal with text inputs for iChart song configuration,
   * pre-populated with existing settings if available.
   * @param interaction - The button interaction.
   * @param result - The parsed configuration data.
   */
  @RequiresGuildContext()
  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { guildConfig } = result

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_ICHART_CONFIG)
      .setTitle('Cài đặt trạng thái')

    const songIdInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_ICHART_SONG_ID)
      .setPlaceholder('Ví dụ: 40551')
      .setValue(guildConfig?.ichartSongId ?? '')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const songIdLabel = new LabelBuilder()
      .setLabel('ID bài hát (từ ICHART)')
      .setTextInputComponent(songIdInput)

    const songNameInput = new TextInputBuilder()
      .setCustomId(CUSTOM_ID.INPUT_ICHART_SONG_NAME)
      .setPlaceholder('Ví dụ: Love Is Lonely')
      .setValue(guildConfig?.ichartSongName ?? '')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const songNameLabel = new LabelBuilder()
      .setLabel('Tên hiển thị của bài hát')
      .setTextInputComponent(songNameInput)

    modal.addLabelComponents(songIdLabel, songNameLabel)

    await interaction.showModal(modal)
  }
}
