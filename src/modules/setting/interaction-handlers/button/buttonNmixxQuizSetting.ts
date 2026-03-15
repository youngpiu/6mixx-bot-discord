import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ButtonInteraction, ChannelType, ModalBuilder } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'

import { SettingHelper } from '~/modules/setting/helpers/SettingHelper'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonNmixxQuizSetting extends InteractionHandler {
  public override async parse(interaction: ButtonInteraction) {
    if (interaction.customId !== CUSTOM_ID.BTN_SETTING_NMIXX_QUIZ)
      return this.none()

    const guildConfig = await SettingRepository.find(interaction.guild!.id)
    return this.some({ guildConfig })
  }

  public async run(
    interaction: ButtonInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { guildConfig } = result

    const labelAnswerChannel = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.nmixxQuizAnswerChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_NMIXX_QUIZ_ANSWER_CHANNEL,
      channelType: ChannelType.GuildText,
      label: 'Kênh text đoán bài (iufi music quiz)',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh text đoán bài',
        channelConfiguredButDeleted: 'Kênh đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh text đoán bài',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const labelVoiceChannel = SettingHelper.createChannelLabel({
      guild: interaction.guild!,
      channelId: guildConfig?.nmixxQuizVoiceChannelId,
      customId: CUSTOM_ID.SELECT_SETTING_NMIXX_QUIZ_VOICE_CHANNEL,
      channelType: ChannelType.GuildVoice,
      label: 'Kênh voice kích hoạt (join to start)',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh voice kích hoạt',
        channelConfiguredButDeleted: 'Kênh đã thiết lập nhưng không tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh voice kích hoạt',
        noChannelsInServer: 'Không có kênh voice nào'
      }
    })

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_SETTING_NMIXX_QUIZ)
      .setTitle('Cài đặt kênh Music Quiz')
      .addLabelComponents(labelAnswerChannel, labelVoiceChannel)

    await interaction.showModal(modal)
  }
}
