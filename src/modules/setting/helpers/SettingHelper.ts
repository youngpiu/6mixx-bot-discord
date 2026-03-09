import {
  ChannelSelectMenuBuilder,
  ChannelType,
  Guild,
  LabelBuilder
} from 'discord.js'

// Helper for managing channel selection placeholders in select menus
// Used for ChannelSelectMenu (forums, text channels, categories, etc.)

export interface ChannelPlaceholderResult {
  placeholder: string
  exists: boolean
}

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
  // Determines the appropriate placeholder text based on guild state and channel configuration
  public static getChannelPlaceholder(
    guild: Guild,
    channelId: string | null | undefined,
    channelType: ChannelType,
    placeholders: {
      channelConfiguredAndExists: string // Configured and still exists
      channelConfiguredButDeleted: string // Configured but was deleted
      channelNotConfigured: string // Not yet configured
      noChannelsInServer: string // No channels of this type in the guild
    }
  ): ChannelPlaceholderResult {
    if (channelId) {
      const exists = guild.channels.cache.has(channelId)
      return {
        placeholder: exists
          ? placeholders.channelConfiguredAndExists
          : placeholders.channelConfiguredButDeleted,
        exists
      }
    }

    const hasChannels = guild.channels.cache.some((c) => c.type === channelType)
    return {
      placeholder: hasChannels
        ? placeholders.channelNotConfigured
        : placeholders.noChannelsInServer,
      exists: false
    }
  }

  // Creates a standardized LabelBuilder containing a ChannelSelectMenu
  // Automatically handles placeholder state based on current channel status
  public static createChannelLabel(
    options: CreateChannelLabelOptions
  ): LabelBuilder {
    const {
      guild,
      channelId,
      customId,
      channelType,
      label,
      description,
      placeholders
    } = options

    const result = this.getChannelPlaceholder(
      guild,
      channelId,
      channelType,
      placeholders
    )

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
