import { ChannelSelectMenuBuilder, ChannelType, Guild, LabelBuilder } from 'discord.js'

import { getChannelPlaceholder } from '~/utils/channelUtil'

type CreateChannelLabelOptions = {
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
}

export class SettingHelper {
  // Helper to create a standardized Channel Select Menu with a Label
  // Handles placeholder logic based on whether a channel is currently configured or exists
  public static createChannelLabel(options: CreateChannelLabelOptions): LabelBuilder {
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
