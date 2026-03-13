import { ChatInputCommandInteraction } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'

/**
 * Command class for renaming a temporary voice channel.
 */
export class VoiceRenameCommand {
  /**
   * Executes the voice rename command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    const { channel, profile } = await TempVoiceContextService.get(interaction)
    const name = interaction.options.getString('name', true).trim()

    await Promise.all([
      channel.setName(name),
      TempVoiceProfileRepository.updateProfile(
        interaction.guildId!,
        profile.ownerId,
        { name }
      )
    ])

    await InteractionUtil.replySuccess(
      interaction,
      'Đã đổi tên phòng thoại tạm thời thành công.'
    )
  }
}
