import { ChannelType, Guild } from 'discord.js'

// ============================================================================
// CHANNEL PLACEHOLDER
// Dùng cho ChannelSelectMenu (chọn kênh diễn đàn, kênh văn bản, danh mục...)
// ============================================================================

export interface ChannelPlaceholderResult {
  placeholder: string
  exists: boolean
}

/**
 * Lấy placeholder cho channel select menu
 *
 * @param guild - Server hiện tại
 * @param channelId - ID kênh đã được cài đặt (hoặc null/undefined nếu chưa cài)
 * @param channelType - Loại kênh cần filter
 * @param placeholders - Các placeholder text tùy chỉnh
 */
export function getChannelPlaceholder(
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
  // Đã cài đặt channelId
  if (channelId) {
    const exists = guild.channels.cache.has(channelId)
    return {
      placeholder: exists
        ? placeholders.channelConfiguredAndExists
        : placeholders.channelConfiguredButDeleted,
      exists
    }
  }

  // Chưa cài đặt - kiểm tra server có kênh nào không
  const hasChannels = guild.channels.cache.some((c) => c.type === channelType)
  return {
    placeholder: hasChannels ? placeholders.channelNotConfigured : placeholders.noChannelsInServer,
    exists: false
  }
}
