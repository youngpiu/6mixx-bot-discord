import { ChannelType } from 'discord.js'

/**
 * Bảng dịch tên loại kênh Discord sang tiếng Việt.
 * Key: ChannelType (enum số từ discord.js)
 * Value: Tên loại kênh tiếng Việt hiển thị cho người dùng
 */
export const CHANNEL_TYPE_NAMES: Record<ChannelType, string> = {
  [ChannelType.GuildText]: 'Kênh chữ',
  [ChannelType.DM]: 'Tin nhắn riêng (DM)',
  [ChannelType.GuildVoice]: 'Kênh thoại',
  [ChannelType.GroupDM]: 'Tin nhắn nhóm',
  [ChannelType.GuildCategory]: 'Danh mục kênh',
  [ChannelType.GuildAnnouncement]: 'Kênh thông báo',
  [ChannelType.AnnouncementThread]: 'Luồng thông báo',
  [ChannelType.PublicThread]: 'Luồng công khai',
  [ChannelType.PrivateThread]: 'Luồng riêng tư',
  [ChannelType.GuildStageVoice]: 'Kênh Stage Voice',
  [ChannelType.GuildDirectory]: 'Thư mục server',
  [ChannelType.GuildForum]: 'Kênh diễn đàn',
  [ChannelType.GuildMedia]: 'Kênh media'
}
