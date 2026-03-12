import type { PermissionsString } from 'discord.js'

/**
 * A mapping of Discord {@link PermissionsString} flags to their human-readable Vietnamese labels.
 * Used for displaying required or missing permissions in error messages.
 */
export const PERMISSION_NAMES: Record<PermissionsString, string> = {
  CreateInstantInvite: 'Tạo lời mời',
  KickMembers: 'Đuổi thành viên',
  BanMembers: 'Cấm thành viên',
  Administrator: 'Người quản lý',

  ManageChannels: 'Quản lý kênh',
  ManageGuild: 'Quản lý máy chủ',

  AddReactions: 'Thêm biểu cảm',
  ViewAuditLog: 'Xem nhật ký chỉnh sửa',

  PrioritySpeaker: 'Người nói ưu tiên',
  Stream: 'Video (Phát trực tiếp)',

  ViewChannel: 'Xem các kênh',
  SendMessages: 'Gửi tin nhắn và tạo bài đăng',
  SendTTSMessages: 'Gửi tin nhắn văn bản thành giọng nói',

  ManageMessages: 'Quản lý tin nhắn',
  EmbedLinks: 'Nhúng liên kết',
  AttachFiles: 'Đính kèm tập tin',
  ReadMessageHistory: 'Xem lịch sử tin nhắn',

  MentionEveryone: 'Đề cập @everyone, @here và tất cả vai trò',

  UseExternalEmojis: 'Dùng emoji mở rộng',

  ViewGuildInsights: 'Xem thống kê máy chủ',

  Connect: 'Kết nối',
  Speak: 'Nói',
  MuteMembers: 'Tắt âm thành viên',
  DeafenMembers: 'Tắt nghe thành viên',
  MoveMembers: 'Di chuyển thành viên',
  UseVAD: 'Sử dụng chế độ tự động nhận diện giọng nói',

  ChangeNickname: 'Đổi biệt danh',
  ManageNicknames: 'Quản lý biệt danh',

  ManageRoles: 'Quản lý vai trò',
  ManageWebhooks: 'Quản lý webhook',

  ManageEmojisAndStickers: 'Quản lý biểu cảm',
  ManageGuildExpressions: 'Quản lý biểu cảm',

  UseApplicationCommands: 'Sử dụng câu lệnh ứng dụng',

  RequestToSpeak: 'Yêu cầu để nói',

  ManageEvents: 'Quản lý sự kiện',

  ManageThreads: 'Quản lý chủ đề và bài đăng',
  CreatePublicThreads: 'Tạo chủ đề công khai',
  CreatePrivateThreads: 'Tạo chủ đề riêng tư',

  UseExternalStickers: 'Dùng sticker mở rộng',

  SendMessagesInThreads: 'Gửi tin nhắn trong chủ đề',

  UseEmbeddedActivities: 'Sử dụng hoạt động',

  ModerateMembers: 'Hạn chế thành viên',

  ViewCreatorMonetizationAnalytics: 'Xem phân tích kiếm tiền',

  UseSoundboard: 'Dùng biểu cảm tiếng',

  CreateGuildExpressions: 'Tạo biểu cảm',

  CreateEvents: 'Tạo sự kiện',

  UseExternalSounds: 'Dùng âm thanh bên ngoài',

  SendVoiceMessages: 'Gửi tin nhắn thoại',

  SendPolls: 'Tạo khảo sát',

  UseExternalApps: 'Dùng ứng dụng mở rộng',

  PinMessages: 'Ghim tin nhắn',

  BypassSlowmode: 'Bỏ qua chế độ chậm'
}
