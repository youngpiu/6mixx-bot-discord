import { ChatInputCommandInteraction } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'
import { TempVoiceTrustedMemberRepository } from '~/modules/voice/repositories/tempVoiceTrustedMemberRepository'
import { TempVoiceTrustedRoleRepository } from '~/modules/voice/repositories/tempVoiceTrustedRoleRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'
import { TempVoiceProfileEnsureService } from '~/modules/voice/services/tempVoiceProfileEnsureService'
import { TempVoiceTransferService } from '~/modules/voice/services/tempVoiceTransferService'

/**
 * Command class for transferring ownership of a temporary voice channel to another member.
 */
export class VoicePermissionTransferCommand {
  /**
   * Executes the voice permission transfer command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const { channel, profile } = await TempVoiceContextService.get(interaction)
    const target = interaction.options.getUser('user', true)

    if (!channel.members.has(target.id)) {
      throw new NormalError('Người được chuyển quyền phải đang ở trong phòng.')
    }

    if (profile.ownerId === target.id) {
      throw new NormalError('Người này đã là chủ phòng.')
    }

    const guildId = interaction.guild!.id
    const oldOwnerId = profile.ownerId
    const newOwnerId = target.id

    // 1. Ensure the new owner has a Profile
    await TempVoiceProfileEnsureService.ensure(
      guildId,
      newOwnerId,
      channel.name
    )

    // 2 & 3. Get data from the old owner and clear old data of the new owner (Trust lists) in parallel
    const [oldProfile, oldTrustedMembers, oldTrustedRoles] = await Promise.all([
      TempVoiceProfileRepository.findByOwnerId(guildId, oldOwnerId),
      TempVoiceTrustedMemberRepository.listByOwner(guildId, oldOwnerId),
      TempVoiceTrustedRoleRepository.listByOwner(guildId, oldOwnerId),
      TempVoiceTrustedMemberRepository.deleteByOwner(guildId, newOwnerId),
      TempVoiceTrustedRoleRepository.deleteByOwner(guildId, newOwnerId)
    ])

    const updatePromises: Promise<unknown>[] = []

    // 4. Overwrite Profile information (Name, Limit, Lock) to the new owner
    if (oldProfile) {
      updatePromises.push(
        TempVoiceProfileRepository.updateProfile(guildId, newOwnerId, {
          name: oldProfile.name,
          limit: oldProfile.limit,
          locked: oldProfile.locked
        })
      )
    }

    // 5 & 7. Copy Trusted Members, Roles, and Sync Permission Overwrites
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

    // 6. Perform physical channel transfer in the database (Sequenced to avoid race conditions)
    await TempVoiceTransferService.transferActiveChannel(
      channel.id,
      guildId,
      newOwnerId
    )

    await InteractionUtil.replySuccess(
      interaction,
      `Đã chuyển quyền chủ phòng cho <@${target.id}>.`
    )
  }
}
