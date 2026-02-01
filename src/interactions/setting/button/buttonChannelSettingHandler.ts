import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import {
  ButtonInteraction,
  ChannelSelectMenuBuilder,
  ChannelType,
  Guild,
  LabelBuilder,
  ModalBuilder
} from 'discord.js'

import { GuildOnlyError } from '~/core/errorResponse'

import { asyncInteractionHandler } from '~/utils/asyncHandleUtil'
import { getChannelPlaceholder } from '~/utils/channelUtil'

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

    const serviceLabel = this.createChannelLabel({
      guild: interaction.guild,
      channelId: config?.serviceForumChannelId,
      customId: 'select-service-channel',
      channelType: ChannelType.GuildForum,
      label: 'Kênh dịch vụ',
      description:
        'Các bài hướng dẫn về các gửi yêu cầu hỗ trợ, quyên góp,... sẽ được tạo ở kênh này.',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh dịch vụ',
        channelConfiguredButDeleted: 'Kênh bạn đã cài đặt không còn tồn tại',
        channelNotConfigured: 'Chưa cài đặt kênh dịch vụ',
        noChannelsInServer: 'Không có kênh diễn đàn nào'
      }
    })

    const notificationLabel = this.createChannelLabel({
      guild: interaction.guild,
      channelId: config?.notificationChannelId,
      customId: 'select-notification-channel',
      channelType: ChannelType.GuildText,
      label: 'Kênh thông báo',
      description: 'Các kênh thông báo riêng cho từng loại sẽ được tạo ở kênh này.',
      placeholders: {
        channelConfiguredAndExists: 'Chọn kênh thông báo',
        channelConfiguredButDeleted: 'Kênh bạn đã cài đặt không còn tồn tại',
        channelNotConfigured: 'Chưa cài đặt kênh thông báo',
        noChannelsInServer: 'Không có kênh văn bản nào'
      }
    })

    const modal = new ModalBuilder()
      .setCustomId('modal-channel-setting')
      .setTitle('Cài đặt kênh')
      .addLabelComponents(serviceLabel, notificationLabel)

    await interaction.showModal(modal)
  })

  private createChannelLabel(options: {
    guild: Guild
    channelId: string | null | undefined
    customId: string
    channelType: ChannelType
    label: string
    description: string
    placeholders: {
      channelConfiguredAndExists: string
      channelConfiguredButDeleted: string
      channelNotConfigured: string
      noChannelsInServer: string
    }
  }): LabelBuilder {
    const { guild, channelId, customId, channelType, label, description, placeholders } = options

    const result = getChannelPlaceholder(guild, channelId, channelType, placeholders)

    const selectMenu = new ChannelSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(result.placeholder)
      .setChannelTypes([channelType])
      .setRequired(true)

    if (channelId && result.exists) {
      selectMenu.setDefaultChannels([channelId])
    }

    return new LabelBuilder()
      .setLabel(label)
      .setDescription(description)
      .setChannelSelectMenuComponent(selectMenu)
  }
}
