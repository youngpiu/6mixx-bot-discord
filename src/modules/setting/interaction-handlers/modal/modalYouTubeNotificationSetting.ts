import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction, channelMention } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { formatFields } from '~/shared/utils/textUtil'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalYouTubeNotificationSetting extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (
      interaction.customId !== CUSTOM_ID.MODAL_SETTING_SNS_NOTIFICATION_CHANNELS
    )
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const snsYouTubeListenChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_SNS_YOUTUBE_LISTEN_CHANNEL)
      ?.first()?.id

    const snsYouTubePostChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_SNS_YOUTUBE_POST_CHANNEL)
      ?.first()?.id

    const snsTwitterPostChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_SNS_TWITTER_POST_CHANNEL)
      ?.first()?.id

    const snsInstagramPostChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_SETTING_SNS_INSTAGRAM_POST_CHANNEL)
      ?.first()?.id

    await SettingRepository.update(interaction.guild.id, {
      snsYouTubeListenChannelId,
      snsYouTubePostChannelId,
      snsTwitterPostChannelId,
      snsInstagramPostChannelId
    })

    const formattedFields = formatFields([
      [
        'Kênh nhận link',
        snsYouTubeListenChannelId
          ? channelMention(snsYouTubeListenChannelId)
          : 'Không có'
      ],
      [
        'Kênh phát thông báo YouTube',
        snsYouTubePostChannelId
          ? channelMention(snsYouTubePostChannelId)
          : 'Không có'
      ],
      [
        'Kênh phát thông báo Twitter',
        snsTwitterPostChannelId
          ? channelMention(snsTwitterPostChannelId)
          : 'Không có'
      ],
      [
        'Kênh phát thông báo Instagram',
        snsInstagramPostChannelId
          ? channelMention(snsInstagramPostChannelId)
          : 'Không có'
      ]
    ]).join('\n')

    await InteractionUtil.replySuccess(
      interaction,
      'Cập nhật kênh tính năng thông báo SNS thành công.',
      formattedFields
    )
  }
}
