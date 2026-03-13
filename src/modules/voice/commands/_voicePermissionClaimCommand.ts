import { ChatInputCommandInteraction, VoiceChannel } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'
import { TempVoiceTrustedMemberRepository } from '~/modules/voice/repositories/tempVoiceTrustedMemberRepository'
import { TempVoiceTrustedRoleRepository } from '~/modules/voice/repositories/tempVoiceTrustedRoleRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'
import { TempVoiceLockStateService } from '~/modules/voice/services/tempVoiceLockStateService'
import { TempVoiceProfileEnsureService } from '~/modules/voice/services/tempVoiceProfileEnsureService'
import { TempVoiceTransferService } from '~/modules/voice/services/tempVoiceTransferService'

/**
 * Command class for claiming ownership of a temporary voice channel.
 * Allows a user to take over a channel if the current owner left or if it's orphaned.
 */
export class VoicePermissionClaimCommand {
  /**
   * Executes the voice permission claim command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const { channel, profile } = await TempVoiceContextService.get(interaction)

    const setting = await SettingRepository.find(interaction.guildId!)

    if (channel.id === setting?.tempVoiceCreateChannelId) {
      throw new NormalError('Không thể chiếm quyền kênh tạo phòng.')
    }

    if (profile.ownerId === interaction.user.id) {
      throw new NormalError('Bạn đã là chủ phòng.')
    }

    if (channel.members.has(profile.ownerId)) {
      throw new NormalError('Chủ phòng vẫn đang ở trong phòng.')
    }

    const guildId = interaction.guild!.id
    const oldOwnerId = profile?.ownerId
    const newOwnerId = interaction.user.id

    // 1. Ensure the new owner has a Profile
    await TempVoiceProfileEnsureService.ensure(
      guildId,
      newOwnerId,
      channel.name
    )

    // 2. Clear old data of the new owner (Trust lists) to prepare for overwrite/refresh
    await Promise.all([
      TempVoiceTrustedMemberRepository.deleteByOwner(guildId, newOwnerId),
      TempVoiceTrustedRoleRepository.deleteByOwner(guildId, newOwnerId)
    ])

    if (oldOwnerId) {
      // SCENARIO A: PREVIOUS OWNER EXISTS - Overwrite information from previous owner
      const [oldProfile, oldTrustedMembers, oldTrustedRoles] =
        await Promise.all([
          TempVoiceProfileRepository.findByOwnerId(guildId, oldOwnerId),
          TempVoiceTrustedMemberRepository.listByOwner(guildId, oldOwnerId),
          TempVoiceTrustedRoleRepository.listByOwner(guildId, oldOwnerId)
        ])

      const updatePromises: Promise<unknown>[] = []

      if (oldProfile) {
        updatePromises.push(
          TempVoiceProfileRepository.updateProfile(guildId, newOwnerId, {
            name: oldProfile.name,
            limit: oldProfile.limit,
            locked: oldProfile.locked
          })
        )
      }

      updatePromises.push(
        ...oldTrustedMembers.map((m) =>
          TempVoiceTrustedMemberRepository.add(guildId, newOwnerId, m.userId)
        ),
        ...oldTrustedRoles.map((r) =>
          TempVoiceTrustedRoleRepository.add(guildId, newOwnerId, r.roleId)
        ),
        ...oldTrustedMembers.map((m) =>
          channel.permissionOverwrites
            .edit(m.userId, { Connect: true })
            .catch(() => null)
        ),
        ...oldTrustedRoles.map((r) =>
          channel.permissionOverwrites
            .edit(r.roleId, { Connect: true })
            .catch(() => null)
        )
      )

      await Promise.all(updatePromises)
    } else {
      // SCENARIO B: ORPHANED ROOM - Sync Profile of the claimant according to current channel parameters
      const locked = TempVoiceLockStateService.get(channel as VoiceChannel)
      await TempVoiceProfileRepository.updateProfile(guildId, newOwnerId, {
        name: channel.name,
        limit: channel.userLimit,
        locked: locked
      })
    }

    // 3. Perform physical channel transfer in the database
    await TempVoiceTransferService.transferActiveChannel(
      channel.id,
      guildId,
      newOwnerId
    )

    await InteractionUtil.replySuccess(
      interaction,
      'Bạn đã trở thành chủ phòng mới.'
    )
  }
}
