import { ApplyOptions } from '@sapphire/decorators'
import {
  InteractionHandler,
  InteractionHandlerTypes
} from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { GuildRepository } from '~/shared/repositories/guildRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { lines } from '~/shared/utils/textUtil'

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalDisbursementSetting extends InteractionHandler {
  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_DISBURSEMENT_LOG_SETTING)
      return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction.guild) return

    const disbursementLogChannelId = interaction.fields
      .getSelectedChannels(CUSTOM_ID.SELECT_DISBURSEMENT_LOG_CHANNEL)
      ?.first()?.id

    await GuildRepository.update(interaction.guild.id, {
      disbursementLogChannelId
    })

    await InteractionUtil.replySuccess(
      interaction,
      'Bạn đã cập nhật thành công kênh trong **Cài đặt hệ thống quyên góp**.',
      lines(
        `- **Kênh sao kê khoản chi:** ${disbursementLogChannelId ? `<#${disbursementLogChannelId}>` : '*Chưa thiết lập*'}`
      )
    )
  }
}
