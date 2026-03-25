import { ChatInputCommandInteraction } from 'discord.js'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'
import { TempVoiceTrustedMemberRepository } from '~/modules/voice/repositories/tempVoiceTrustedMemberRepository'
import { TempVoiceTrustedRoleRepository } from '~/modules/voice/repositories/tempVoiceTrustedRoleRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'

/**
 * Command class for resetting a temporary voice channel to default settings.
 */
export class VoiceResetCommand {
  /**
   * Executes the voice reset command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    const { channel, profile } = await TempVoiceContextService.get(interaction)
    const guildId = interaction.guildId!
    const ownerId = profile.ownerId

    const [trustedUsers, trustedRoles] = await Promise.all([
      TempVoiceTrustedMemberRepository.listByOwner(guildId, ownerId),
      TempVoiceTrustedRoleRepository.listByOwner(guildId, ownerId)
    ])

    await Promise.all([
      channel.setUserLimit(0),
      channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
        Connect: null
      }),
      ...trustedUsers.map((u) => channel.permissionOverwrites.delete(u.userId)),
      ...trustedRoles.map((r) => channel.permissionOverwrites.delete(r.roleId)),
      TempVoiceTrustedMemberRepository.deleteByOwner(guildId, ownerId),
      TempVoiceTrustedRoleRepository.deleteByOwner(guildId, ownerId),
      TempVoiceProfileRepository.updateProfile(guildId, ownerId, {
        limit: 0,
        locked: false
      })
    ])

    await InteractionUtil.replySuccess(
      interaction,
      'Đã reset phòng thoại tạm thời về mặc định (không giới hạn, mở khóa, xóa danh sách tin cậy).'
    )
  }
}
