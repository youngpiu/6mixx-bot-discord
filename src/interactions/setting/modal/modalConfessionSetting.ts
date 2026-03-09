import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { CUSTOM_ID } from '~/constants/idConstant'

import { InteractionUtil } from '~/utils/messageUtil'
import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class ModalConfessionSetting extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== CUSTOM_ID.MODAL_CONFESSION_GENERAL_SETTING) return this.none()
    return this.some()
  }

  public async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })
    if (!interaction || !interaction.guild) return

    const confessionForumChannelId = interaction.fields
      .getSelectedChannels('select-confession-forum-channel')
      ?.first()?.id

    await GuildRepository.updateConfig(interaction.guild.id, {
      confessionForumChannelId
    })

    await InteractionUtil.replySuccess(
      interaction,
      'Bạn đã cập nhật thành công kênh trong **Cài đặt confession**.',
      lines(
        `- **Kênh đăng confession:** ${confessionForumChannelId ? `<#${confessionForumChannelId}>` : '*Chưa thiết lập*'}`
      )
    )
  }
}
