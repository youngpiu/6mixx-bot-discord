import { ChatInputCommandInteraction } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'

/**
 * Command class for locking a temporary voice channel.
 * Prevents everyone from connecting.
 */
export class VoiceLockCommand {
  /**
   * Executes the voice lock command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    const { channel, profile } = await TempVoiceContextService.get(interaction)

    await Promise.all([
      channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
        Connect: false
      }),
      TempVoiceProfileRepository.updateProfile(
        interaction.guildId!,
        profile.ownerId,
        { locked: true }
      )
    ])

    await InteractionUtil.replySuccess(
      interaction,
      'Đã khóa phòng thoại tạm thời thành công.'
    )
  }
}
