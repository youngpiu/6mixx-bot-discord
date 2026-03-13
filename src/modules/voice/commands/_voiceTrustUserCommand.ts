import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  UserSelectMenuBuilder
} from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'

import { TempVoiceTrustedMemberRepository } from '~/modules/voice/repositories/tempVoiceTrustedMemberRepository'
import { TempVoiceContextService } from '~/modules/voice/services/tempVoiceContextService'

/**
 * Command class for managing trusted members in temporary voice channels.
 * Opens a modal to select users.
 */
export class VoiceTrustUserCommand {
  /**
   * Executes the trust user command.
   * @param interaction The chat input command interaction.
   */
  public static async run(interaction: ChatInputCommandInteraction) {
    const { profile } = await TempVoiceContextService.get(interaction)

    const trustedList = await TempVoiceTrustedMemberRepository.listByOwner(
      interaction.guildId!,
      profile.ownerId
    )
    const previouslyTrustedUsers = trustedList.map((t) => t.userId)

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_ID.MODAL_VOICE_TRUST_USER)
      .setTitle('Người được phép vào phòng')

    const userSelect = new UserSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT_VOICE_TRUST_USER)
      .setPlaceholder('Nhập tên người để tìm kiếm...')
      .setMinValues(0)
      .setMaxValues(25)
      .setRequired(false)

    if (previouslyTrustedUsers.length > 0) {
      userSelect.setDefaultUsers(previouslyTrustedUsers)
    }

    const label = new LabelBuilder()
      .setLabel('Danh sách người được phép vào phòng')
      .setUserSelectMenuComponent(userSelect)
      .setDescription(
        'Bạn hãy chọn những người mà bạn cho phép họ vào phòng khi khoá.'
      )

    modal.addLabelComponents(label)

    await interaction.showModal(modal)
  }
}
