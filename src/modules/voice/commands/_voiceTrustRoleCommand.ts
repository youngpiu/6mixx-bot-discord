import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

import { TempVoiceTrustedRoleRepository } from '~/modules/voice/repositories/tempVoiceTrustedRoleRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'

/**
 * Command class for managing trusted roles in temporary voice channels.
 * Opens a modal to select roles.
 */
export class VoiceTrustRoleCommand {
  /**
   * Executes the trust role command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    const { profile } = await TempVoiceContextService.get(interaction)

    const trustedList = await TempVoiceTrustedRoleRepository.listByOwner(
      interaction.guildId!,
      profile.ownerId
    )
    const previouslyTrustedRoles = trustedList
      .map((t: { roleId: string }) =>
        interaction.guild?.roles.cache.get(t.roleId)
      )
      .filter((r): r is NonNullable<typeof r> => !!r && !r.managed)
      .map((r) => r.id)

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_VOICE_TRUST_ROLE)
      .setTitle('Vai trò được phép vào phòng')

    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_VOICE_TRUST_ROLE)
      .setPlaceholder('Nhập tên vai trò để tìm kiếm...')
      .setMinValues(0)
      .setMaxValues(25)
      .setRequired(false)

    if (previouslyTrustedRoles.length > 0) {
      roleSelect.setDefaultRoles(previouslyTrustedRoles)
    }

    const label = new LabelBuilder()
      .setLabel('Danh sách vai trò được phép vào phòng')
      .setRoleSelectMenuComponent(roleSelect)
      .setDescription(
        'Bạn hãy chọn những vai trò mà bạn cho phép những người có vai trò đó được vào phòng khi khoá.'
      )

    modal.addLabelComponents(label)

    await interaction.showModal(modal)
  }
}
