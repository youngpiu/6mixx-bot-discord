import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { GuildOnlyError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class ModalConfessionSettingHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== 'modal-confession-general-setting') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ModalSubmitInteraction>(async (interaction) => {
    if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()
    await interaction.deferReply({ flags: ['Ephemeral'] })

    // Get forum channel selection
    const channels = interaction.fields.getSelectedChannels('select-confession-forum-channel')
    const forumChannel = channels?.first()
    const forumChannelId = forumChannel?.id

    if (forumChannelId) {
      await GuildRepository.updateConfig(interaction.guildId, {
        confessionForumChannelId: forumChannelId
      })
    }

    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          title: 'Thiết lập thành công',
          description: forumChannelId
            ? `Kênh chứa bài đăng confession đã được cập nhật: <#${forumChannelId}>`
            : 'Không có thay đổi nào được lưu.'
        })
      ]
    })

    await deleteReplyInteraction(interaction)
  })
}
