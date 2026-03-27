import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction, userMention } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceDeniedMemberRepository } from '~/modules/voice/repositories/tempVoiceDeniedMemberRepository'
import { TempVoiceTrustedMemberRepository } from '~/modules/voice/repositories/tempVoiceTrustedMemberRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'

/**
 * Handler for the modal that manages trusted users for a temporary voice channel.
 */
@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalVoiceTrustUser extends InteractionHandler {
  /**
   * Parses the interaction to determine if it should be handled by this class.
   * @param interaction The modal submit interaction.
   * @returns The parsing result containing previously trusted users and the owner ID.
   */
  public override async parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_VOICE_TRUST_USER)
      return this.none()

    const { profile, channel } = await TempVoiceContextService.get(interaction)

    const trustedList = await TempVoiceTrustedMemberRepository.listByOwner(
      interaction.guildId!,
      profile.ownerId
    )
    const previouslyTrustedUsers = trustedList.map((t) => t.userId)

    const deniedList = await TempVoiceDeniedMemberRepository.listByOwner(
      interaction.guildId!,
      profile.ownerId
    )
    const previouslyDeniedUsers = deniedList.map((t) => t.userId)

    return this.some({
      previouslyTrustedUsers,
      previouslyDeniedUsers,
      ownerId: profile.ownerId,
      channel
    })
  }

  /**
   * Processes the modal submission to update the trusted users list.
   * @param interaction The modal submit interaction.
   * @param result The result from the parse method.
   */

  public async run(
    interaction: ModalSubmitInteraction,
    result: InteractionHandler.ParseResult<ModalVoiceTrustUser>
  ) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const { previouslyTrustedUsers, previouslyDeniedUsers, ownerId, channel } =
      result

    const selectedTrustedUsersCollection = interaction.fields.getSelectedUsers(
      CUSTOM_ID.SELECT_VOICE_TRUST_USER
    )
    const selectedDeniedUsersCollection = interaction.fields.getSelectedUsers(
      CUSTOM_ID.SELECT_VOICE_UNTRUST_USER
    )

    // Filter out bots and the room owner
    let selectedTrustedUserIds = selectedTrustedUsersCollection
      ? [...selectedTrustedUsersCollection.values()]
          .filter((u) => !u.bot && u.id !== ownerId)
          .map((u) => u.id)
      : []

    const selectedDeniedUserIds = selectedDeniedUsersCollection
      ? [...selectedDeniedUsersCollection.values()]
          .filter((u) => !u.bot && u.id !== ownerId)
          .map((u) => u.id)
      : []

    // Priority to Denied: If user is in both, remove from Trusted
    selectedTrustedUserIds = selectedTrustedUserIds.filter(
      (id) => !selectedDeniedUserIds.includes(id)
    )

    const toRemoveTrusted = previouslyTrustedUsers.filter(
      (id) => !selectedTrustedUserIds.includes(id)
    )
    const toAddTrusted = selectedTrustedUserIds.filter(
      (id) => !previouslyTrustedUsers.includes(id)
    )

    const toRemoveDenied = previouslyDeniedUsers.filter(
      (id) => !selectedDeniedUserIds.includes(id)
    )
    const toAddDenied = selectedDeniedUserIds.filter(
      (id) => !previouslyDeniedUsers.includes(id)
    )

    if (
      toRemoveTrusted.length === 0 &&
      toAddTrusted.length === 0 &&
      toRemoveDenied.length === 0 &&
      toAddDenied.length === 0
    ) {
      throw new NormalError('Không có thay đổi nào được thực hiện.')
    }

    const affectedUserIds = new Set([
      ...previouslyTrustedUsers,
      ...previouslyDeniedUsers,
      ...selectedTrustedUserIds,
      ...selectedDeniedUserIds
    ])

    const promises: Promise<unknown>[] = []

    for (const userId of affectedUserIds) {
      const isTrustedNow = selectedTrustedUserIds.includes(userId)
      const isDeniedNow = selectedDeniedUserIds.includes(userId)
      const wasTrusted = previouslyTrustedUsers.includes(userId)
      const wasDenied = previouslyDeniedUsers.includes(userId)

      // DB Updates
      if (isTrustedNow && !wasTrusted) {
        promises.push(
          TempVoiceTrustedMemberRepository.add(
            interaction.guildId!,
            ownerId,
            userId
          )
        )
      } else if (!isTrustedNow && wasTrusted) {
        promises.push(
          TempVoiceTrustedMemberRepository.remove(
            interaction.guildId!,
            ownerId,
            userId
          )
        )
      }

      if (isDeniedNow && !wasDenied) {
        promises.push(
          TempVoiceDeniedMemberRepository.add(
            interaction.guildId!,
            ownerId,
            userId
          )
        )
      } else if (!isDeniedNow && wasDenied) {
        promises.push(
          TempVoiceDeniedMemberRepository.remove(
            interaction.guildId!,
            ownerId,
            userId
          )
        )
      }

      // Voice Permission Updates
      if (isDeniedNow) {
        promises.push(
          channel.permissionOverwrites.edit(userId, { Connect: false })
        )
      } else if (isTrustedNow) {
        promises.push(
          channel.permissionOverwrites.edit(userId, { Connect: true })
        )
      } else if (wasTrusted || wasDenied) {
        promises.push(channel.permissionOverwrites.delete(userId))
      }
    }

    await Promise.all(promises)

    let replyMessage = ''
    // Filter out users that were implicitly removed because they moved to the other list
    const trulyRemovedTrusted = toRemoveTrusted.filter(
      (id) => !toAddDenied.includes(id)
    )
    const trulyRemovedDenied = toRemoveDenied.filter(
      (id) => !toAddTrusted.includes(id)
    )

    if (toAddTrusted.length > 0)
      replyMessage += `Đã thêm người được phép vào phòng: ${toAddTrusted.map(userMention).join(', ')}\n`
    if (trulyRemovedTrusted.length > 0)
      replyMessage += `Đã loại bỏ người được phép vào phòng: ${trulyRemovedTrusted.map(userMention).join(', ')}\n`
    if (toAddDenied.length > 0)
      replyMessage += `Đã cấm người vào phòng: ${toAddDenied.map(userMention).join(', ')}\n`
    if (trulyRemovedDenied.length > 0)
      replyMessage += `Đã gỡ lệnh cấm: ${trulyRemovedDenied.map(userMention).join(', ')}\n`

    await InteractionUtil.replySuccess(interaction, replyMessage.trim())
  }
}
