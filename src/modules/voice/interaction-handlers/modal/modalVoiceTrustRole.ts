import { ApplyOptions, RequiresGuildContext } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import {
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  roleMention
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { InteractionUtil } from '~/shared/utils/messageUtil'

import { TempVoiceTrustedRoleRepository } from '~/modules/voice/repositories/tempVoiceTrustedRoleRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'

/**
 * Handler for the modal that manages trusted roles for a temporary voice channel.
 */
@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalVoiceTrustRole extends InteractionHandler {
  /**
   * Parses the interaction to determine if it should be handled by this class.
   * @param interaction The modal submit interaction.
   * @returns The parsing result containing previously trusted roles and the owner ID.
   */
  public override async parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_VOICE_TRUST_ROLE)
      return this.none()

    const { profile } = await TempVoiceContextService.get(
      interaction as unknown as ChatInputCommandInteraction
    )

    const trustedList = await TempVoiceTrustedRoleRepository.listByOwner(
      interaction.guildId!,
      profile.ownerId
    )
    const previouslyTrustedRoles = trustedList.map((t) => t.roleId)

    return this.some({ previouslyTrustedRoles, ownerId: profile.ownerId })
  }

  /**
   * Processes the modal submission to update the trusted roles list.
   * @param interaction The modal submit interaction.
   * @param result The result from the parse method.
   */
  @RequiresGuildContext()
  public async run(
    interaction: ModalSubmitInteraction,
    result: InteractionHandler.ParseResult<ModalVoiceTrustRole>
  ) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const { previouslyTrustedRoles, ownerId } = result

    const selectedRolesCollection = interaction.fields.getSelectedRoles(
      CUSTOM_ID.SELECT_VOICE_TRUST_ROLE
    )

    const selectedRoles = selectedRolesCollection
      ? [...selectedRolesCollection.values()]
      : []

    const selectedRoleIds: string[] = selectedRoles
      .filter(
        (r): r is NonNullable<typeof r> =>
          r !== null &&
          !r.managed &&
          r.id !== interaction.guild?.roles.everyone.id
      )
      .map((r) => r.id)

    const toRemove: string[] = previouslyTrustedRoles.filter(
      (id) => !selectedRoleIds.includes(id)
    )
    const toAdd: string[] = selectedRoleIds.filter(
      (id) => !previouslyTrustedRoles.includes(id)
    )

    if (toRemove.length === 0 && toAdd.length === 0) {
      throw new NormalError('Không có thay đổi nào được thực hiện.')
    }

    const { channel } = await TempVoiceContextService.get(
      interaction as unknown as ChatInputCommandInteraction
    )

    // Handle removal of trusted roles and their permission overwrites
    const removePromises = toRemove.map(async (roleId) => {
      await TempVoiceTrustedRoleRepository.remove(
        interaction.guildId!,
        ownerId,
        roleId
      )
      await channel.permissionOverwrites.delete(roleId)
    })

    // Handle addition of trusted roles and their permission overwrites
    const addPromises = toAdd.map(async (roleId) => {
      await TempVoiceTrustedRoleRepository.add(
        interaction.guildId!,
        ownerId,
        roleId
      )
      await channel.permissionOverwrites.edit(roleId, {
        Connect: true
      })
    })

    // Wait for all database and Discord API updates to complete
    await Promise.all([...removePromises, ...addPromises])

    let replyMessage = ''
    if (toAdd.length > 0) {
      replyMessage += `Đã thêm vai trò được phép vào phòng: ${toAdd.map(roleMention).join(', ')}\n`
    }
    if (toRemove.length > 0) {
      replyMessage += `Đã loại bỏ vai trò được phép vào phòng: ${toRemove.map(roleMention).join(', ')}`
    }

    await InteractionUtil.replySuccess(interaction, replyMessage)
  }
}
