import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'

/**
 * Command class for inviting users to join a temporary voice channel via DM.
 */
export class VoiceInviteCommand {
  /**
   * Executes the voice invite command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const { channel } = await TempVoiceContextService.get(interaction)

    const targetUser = interaction.options.getUser('user', true)

    if (targetUser.id === interaction.user.id) {
      throw new NormalError('Bạn không thể tự mời chính mình.')
    }

    const targetMember = await interaction.guild?.members
      .fetch(targetUser.id)
      .catch(() => null)

    if (targetMember && targetMember.voice.channelId === channel.id) {
      throw new NormalError('Người này hiện đã ở trong phòng thoại rồi.')
    }

    try {
      await targetUser.send({
        content: `Hi! Bạn vừa được **<@${interaction.user.id}>** mời tham gia phòng thoại **${channel.url}**.`
      })

      await InteractionUtil.replySuccess(
        interaction,
        `Đã gửi lời mời tới **<@${targetUser.id}>** qua tin nhắn riêng.`
      )
    } catch {
      throw new NormalError(
        'Không thể gửi tin nhắn cho người này (có thể họ đã tắt nhận tin nhắn từ người lạ).'
      )
    }
  }
}
