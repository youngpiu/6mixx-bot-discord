import { ChatInputCommandInteraction } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'

/**
 * Command class for unlocking a temporary voice channel.
 * Restores connection permissions for everyone.
 */
export class VoiceUnlockCommand {
  /**
   * Executes the voice unlock command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    const { channel, profile } = await TempVoiceContextService.get(interaction)

    await Promise.all([
      channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
        Connect: null
      }),
      TempVoiceProfileRepository.updateProfile(
        interaction.guildId!,
        profile.ownerId,
        { locked: false }
      )
    ])

    await InteractionUtil.replySuccess(
      interaction,
      'Đã mở khóa phòng thoại tạm thời thành công.'
    )
  }
}
