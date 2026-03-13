import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction, userMention } from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

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

    return this.some({
      previouslyTrustedUsers,
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

    const { previouslyTrustedUsers, ownerId, channel } = result

    const selectedUsersCollection = interaction.fields.getSelectedUsers(
      CUSTOM_ID.SELECT_VOICE_TRUST_USER
    )

    // Filter out bots and the room owner
    const selectedUsers = selectedUsersCollection
      ? [...selectedUsersCollection.values()].filter(
          (u) => !u.bot && u.id !== ownerId
        )
      : []

    const selectedUserIds = selectedUsers.map((u) => u.id)

    const toRemove = previouslyTrustedUsers.filter(
      (id) => !selectedUserIds.includes(id)
    )
    const toAdd = selectedUserIds.filter(
      (id) => !previouslyTrustedUsers.includes(id)
    )

    if (toRemove.length === 0 && toAdd.length === 0) {
      throw new NormalError('Không có thay đổi nào được thực hiện.')
    }

    // Handle removal of trusted members and their permission overwrites
    const removePromises = toRemove.map(async (userId) => {
      await TempVoiceTrustedMemberRepository.remove(
        interaction.guildId!,
        ownerId,
        userId
      )
      await channel.permissionOverwrites.delete(userId)
    })

    // Handle addition of trusted members and their permission overwrites
    const addPromises = toAdd.map(async (userId) => {
      await TempVoiceTrustedMemberRepository.add(
        interaction.guildId!,
        ownerId,
        userId
      )
      await channel.permissionOverwrites.edit(userId, {
        Connect: true
      })
    })

    // Wait for all database and Discord API updates to complete
    await Promise.all([...removePromises, ...addPromises])

    let replyMessage = ''
    if (toAdd.length > 0) {
      replyMessage += `Đã thêm người được phép vào phòng: ${toAdd.map(userMention).join(', ')}\n`
    }
    if (toRemove.length > 0) {
      replyMessage += `Đã loại bỏ người được phép vào phòng: ${toRemove.map(userMention).join(', ')}`
    }

    await InteractionUtil.replySuccess(interaction, replyMessage)
  }
}
