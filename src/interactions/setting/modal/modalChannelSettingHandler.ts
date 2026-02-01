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

    const serviceChannels = interaction.fields.getSelectedChannels('select-service-channel')
    const serviceChannel = serviceChannels?.first()

    const notificationChannels = interaction.fields.getSelectedChannels(
      'select-notification-channel'
    )
    const notificationChannel = notificationChannels?.first()

    const updateData: { serviceForumChannelId?: string; notificationChannelId?: string } = {}
    const messages: string[] = []

    if (serviceChannel) {
      updateData.serviceForumChannelId = serviceChannel.id
      messages.push(`Kênh dịch vụ: <#${serviceChannel.id}>`)
    }

    if (notificationChannel) {
      updateData.notificationChannelId = notificationChannel.id
      messages.push(`Kênh thông báo: <#${notificationChannel.id}>`)
    }

    if (Object.keys(updateData).length > 0) {
      await GuildRepository.updateConfig(interaction.guildId, updateData)
    }

    await interaction.reply({
      embeds: [
        createSuccessEmbed({
          title: 'Cài đặt thành công',
          description: messages.length > 0 ? messages.join('\n') : 'Không có thay đổi nào được lưu.'
        })
      ],
      flags: ['Ephemeral']
    })

    await deleteReplyInteraction(interaction)
  })
}
