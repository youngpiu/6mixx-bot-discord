import { ChannelSelectMenuBuilder, ChannelType, Guild, LabelBuilder } from 'discord.js'

// ============================================================================
// CHANNEL PLACEHOLDER
// Dùng cho ChannelSelectMenu (chọn kênh diễn đàn, kênh văn bản, danh mục...)
// ============================================================================

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
  /**
   * Lấy placeholder cho channel select menu
   *
   * @param guild - Server hiện tại
   * @param channelId - ID kênh đã được cài đặt (hoặc null/undefined nếu chưa cài)
   * @param channelType - Loại kênh cần filter
   * @param placeholders - Các placeholder text tùy chỉnh
   */
  public static getChannelPlaceholder(
    guild: Guild,
    channelId: string | null | undefined,
    channelType: ChannelType,
    placeholders: {
      channelConfiguredAndExists: string // Đã cài đặt và kênh vẫn tồn tại
      channelConfiguredButDeleted: string // Đã cài đặt nhưng kênh đã bị xóa
      channelNotConfigured: string // Chưa cài đặt kênh
      noChannelsInServer: string // Server không có kênh nào thuộc loại này
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

  /**
   * Tạo LabelBuilder chuẩn với ChannelSelectMenu.
   * Tự xử lý placeholder dựa trên trạng thái kênh hiện tại.
   */
  public static createChannelLabel(options: CreateChannelLabelOptions): LabelBuilder {
    const { guild, channelId, customId, channelType, label, description, placeholders } = options

    const result = this.getChannelPlaceholder(guild, channelId, channelType, placeholders)

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
