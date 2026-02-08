import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ModalSubmitInteraction } from 'discord.js'

import { GuildOnlyError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { createSuccessEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class ModalChannelSettingHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit
    })
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId !== 'modal-channel-setting') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ModalSubmitInteraction>(async (interaction) => {
    if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()
    await interaction.deferReply({ flags: ['Ephemeral'] })

    const serviceChannel = interaction.fields.getSelectedChannels('select-service-channel')?.first()
    const notificationChannel = interaction.fields
      .getSelectedChannels('select-notification-channel')
      ?.first()

    const updateData: { serviceForumChannelId?: string; notificationForumChannelId?: string } = {}
    const messages: string[] = []

    if (serviceChannel) {
      updateData.serviceForumChannelId = serviceChannel.id
      messages.push(`Kênh dịch vụ đã được tạo: <#${serviceChannel.id}>`)
    }

    if (notificationChannel) {
      updateData.notificationForumChannelId = notificationChannel.id
      messages.push(`Kênh thông báo đã được tạo: <#${notificationChannel.id}>`)
    }

    if (Object.keys(updateData).length > 0) {
      await GuildRepository.updateConfig(interaction.guildId, updateData)
    }

    await interaction.editReply({
      embeds: [
        createSuccessEmbed({
          title: 'Thiết lập thành công',
          description: messages.length > 0 ? messages.join('\n') : 'Không có thay đổi nào được lưu.'
        })
      ]
    })

    await deleteReplyInteraction(interaction)
  })
}
