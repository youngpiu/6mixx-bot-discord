import { ChatInputCommandInteraction } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'

/**
 * Command class for setting the user limit of a temporary voice channel.
 */
export class VoiceLimitCommand {
  /**
   * Executes the voice limit command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    const { channel, profile } = await TempVoiceContextService.get(interaction)
    const limit = interaction.options.getInteger('limit', true)

    await Promise.all([
      channel.setUserLimit(limit),
      TempVoiceProfileRepository.updateProfile(
        interaction.guildId!,
        profile.ownerId,
        { limit }
      )
    ])

    await InteractionUtil.replySuccess(
      interaction,
      limit === 0
        ? 'Đã gỡ giới hạn số người trong phòng thoại tạm thời.'
        : `Đã đặt giới hạn **${limit}** người cho phòng thoại tạm thời.`
    )
  }
}
