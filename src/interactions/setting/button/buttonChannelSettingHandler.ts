import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { ButtonInteraction, ChannelType, ModalBuilder } from 'discord.js'

import { GuildOnlyError } from '~/core/errorResponse'

import { SettingHelper } from '~/helpers/SettingHelper'
import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'

import { GuildRepository } from '~/repositories/guildRepository'

export class ButtonChannelSettingHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== 'btn-channel-setting') return this.none()
    return this.some()
  }

  public run = asyncInteractionHandler<ButtonInteraction>(async (interaction) => {
    if (!interaction.guildId || !interaction.guild) throw new GuildOnlyError()

    const config = await GuildRepository.getGuild(interaction.guildId)

    const serviceLabel = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: config?.serviceForumChannelId,
      customId: 'select-service-channel',
      channelType: ChannelType.GuildForum,
      label: 'Kênh dịch vụ',
      description:
        'Các bài hướng dẫn về các gửi yêu cầu hỗ trợ, quyên góp,... sẽ được tạo ở kênh này.',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh dịch vụ',
        channelConfiguredButDeleted: 'Kênh dịch vụ đã thiết lập không còn tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh dịch vụ',
        noChannelsInServer: 'Không có kênh diễn đàn nào'
      }
    })

    const notificationLabel = SettingHelper.createChannelLabel({
      guild: interaction.guild,
      channelId: config?.notificationChannelId,
      customId: 'select-notification-channel',
      channelType: ChannelType.GuildText,
      label: 'Kênh thông báo',
      description: 'Các kênh thông báo riêng cho từng loại sẽ được tạo ở kênh này.',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh thông báo',
        channelConfiguredButDeleted: 'Kênh thông báo đã thiết lập không còn tồn tại',
        channelNotConfigured: 'Chưa thiết lập kênh thông báo',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const modal = new ModalBuilder()
      .setCustomId('modal-channel-setting')
      .setTitle('Cài đặt hệ thống')
      .addLabelComponents(serviceLabel, notificationLabel)

    await interaction.showModal(modal)
  })
}
