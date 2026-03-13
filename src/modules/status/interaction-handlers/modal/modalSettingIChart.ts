import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { formatFields } from '~/shared/utils/textUtil'

import { IChartService } from '~/modules/status/services/IChartService'

/**
 * Interaction handler for the iChart configuration modal submission.
 * Validates the input, updates the guild settings, and triggers an immediate data fetch.
 */
@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalSettingIChart extends InteractionHandler {
  /**
   * Checks if this handler should process the given modal submission.
   * @param interaction - The modal submit interaction to parse.
   * @returns A "some" result with the submitted song data if matched, otherwise "none".
   */

  public override async parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_SETTING_ICHART_CONFIG)
      return this.none()

    const songId = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_ICHART_SONG_ID
    )
    const songName = interaction.fields.getTextInputValue(
      CUSTOM_ID.INPUT_ICHART_SONG_NAME
    )

    return this.some({ songId, songName })
  }

  /**
   * Executes the handler logic.
   * Saves the song configuration to the setting repository, fetches initial rankings
   * to populate the cache, and replies with a success message.
   * @param interaction - The modal submit interaction.
   * @param result - The parsed song configuration data.
   */

  public async run(
    interaction: ModalSubmitInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    const { songId, songName } = result

    await interaction.deferReply({ flags: ['Ephemeral'] })

    await SettingRepository.update(interaction.guildId!, {
      ichartSongId: songId,
      ichartSongName: songName
    })

    // Trigger immediate fetch to ensure status rotation can start immediately with data
    await IChartService.fetchRankings(songId)

    await InteractionUtil.replySuccess(
      interaction,
      'Đã cập nhật trạng thái thành công.',
      formatFields([
        ['ID bài hát', `**${songId}**`],
        ['Tên bài hát', `**${songName}**`]
      ]).join('\n')
    )
  }
}
