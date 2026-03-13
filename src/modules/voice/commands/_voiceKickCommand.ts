import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'

/**
 * Command class for kicking a member from a temporary voice channel.
 */
export class VoiceKickCommand {
  /**
   * Executes the voice kick command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const { channel } = await TempVoiceContextService.get(interaction)

    const targetUser = interaction.options.getUser('user', true)
    const targetMember = await interaction.guild?.members
      .fetch(targetUser.id)
      .catch(() => null)

    if (!targetMember || targetMember.voice.channelId !== channel.id) {
      throw new NormalError(
        'Người này hiện không ở trong phòng thoại tạm thời của bạn.'
      )
    }

    if (targetMember.id === interaction.user.id) {
      throw new NormalError('Bạn không thể đuổi chính mình.')
    }

    await targetMember.voice.disconnect('Bị chủ phòng đuổi.')

    await InteractionUtil.replySuccess(
      interaction,
      `Đã đuổi **${targetMember.user.username}** ra khỏi phòng thoại tạm thời.`
    )
  }
}
