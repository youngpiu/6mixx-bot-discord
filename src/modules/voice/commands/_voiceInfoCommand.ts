import {
  ChatInputCommandInteraction,
  roleMention,
  userMention
} from 'discord.js'

import { LoggerBuilder } from '~/shared/components/LoggerBuilder'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceTrustedMemberRepository } from '~/modules/voice/repositories/tempVoiceTrustedMemberRepository'
import { TempVoiceTrustedRoleRepository } from '~/modules/voice/repositories/tempVoiceTrustedRoleRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'
import { TempVoiceLockStateService } from '~/modules/voice/services/tempVoiceLockStateService'

/**
 * Command class for viewing information about a temporary voice channel.
 * Displays details like owner, limit, and status.
 */
export class VoiceInfoCommand {
  /**
   * Executes the voice info command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const { channel, profile } = await TempVoiceContextService.get(interaction)

    // Get lists of trusted members and roles
    const trustedMembers = await TempVoiceTrustedMemberRepository.listByOwner(
      interaction.guildId!,
      profile.ownerId
    )
    const trustedRoles = await TempVoiceTrustedRoleRepository.listByOwner(
      interaction.guildId!,
      profile.ownerId
    )

    const isLocked = TempVoiceLockStateService.get(channel)

    const logger = new LoggerBuilder({
      title: `Thông tin phòng ${channel.name}`
    })

    const memberMentions =
      trustedMembers.length > 0
        ? trustedMembers.map((m) => userMention(m.userId)).join(', ')
        : '_'

    const roleMentionsList =
      trustedRoles.length > 0
        ? trustedRoles.map((r) => roleMention(r.roleId)).join(', ')
        : '_'

    logger.addFields([
      ['Tên phòng', `**${channel.name}**`],
      ['Chủ phòng', userMention(profile.ownerId)],
      [
        'Giới hạn',
        profile.limit === 0
          ? '**Không giới hạn**'
          : `**${profile.limit} người**`
      ],
      ['Trạng thái', isLocked ? '**Đang khóa**' : '**Đang mở**'],
      ['Người có thể vào', `${memberMentions}`],
      ['Vai trò có thể vào', `${roleMentionsList}`]
    ])

    await InteractionUtil.editReply(interaction, {
      components: logger.build(),
      flags: ['IsComponentsV2']
    })
  }
}
