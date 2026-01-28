import { container } from '@sapphire/pieces'
import { env } from '~/config/env'

export const RANDOM_LOADING_MESSAGES: string[] = [
  'Đang xử lý...',
  'Đang tải...',
  'Đợi mình tí...',
  'Đang nấu...',
  'Đợi xíu...'
]

// Helper function for error messages
async function getErrorDescription(guildId: string | null, errorType: string) {
  if (!guildId) {
    return env.SUPPORTER_DISCORD_ID
      ? `${errorType} đã xảy ra lỗi, vui lòng thử lại sau hoặc liên hệ <@${env.SUPPORTER_DISCORD_ID}> để được hỗ trợ.`
      : `${errorType} đã xảy ra lỗi, vui lòng thử lại sau hoặc liên hệ **Ban quản lý** để được hỗ trợ.`
  }

  const ticketChannelId = (
    await container.prisma.ticketConfig.findUnique({
      where: { guildId }
    })
  )?.ticketChannelId

  if (ticketChannelId) {
    return `${errorType} đã xảy ra lỗi, vui lòng thử lại sau hoặc báo lỗi tại kênh <#${ticketChannelId}> để được hỗ trợ.`
  }

  return env.SUPPORTER_DISCORD_ID
    ? `${errorType} đã xảy ra lỗi, vui lòng thử lại sau hoặc liên hệ <@${env.SUPPORTER_DISCORD_ID}> để được hỗ trợ.`
    : `${errorType} đã xảy ra lỗi, vui lòng thử lại sau hoặc liên hệ **Ban quản lý** để được hỗ trợ.`
}

export const ERROR_MESSAGE = {
  BAD_REQUEST: {
    TITLE: 'Yêu cầu không hợp lệ',
    DESCRIPTION: 'Yêu cầu bạn gửi không hợp lệ. Vui lòng kiểm tra và thử lại.',
    GUILD_ONLY_DESCRIPTION: 'Lệnh này chỉ khả dụng trong máy chủ, không hỗ trợ tin nhắn riêng.'
  },

  NOT_FOUND: {
    TITLE: 'Không tìm thấy',
    DESCRIPTION: 'Nội dung bạn yêu cầu không tồn tại hoặc đã bị xóa.'
  },

  FORBIDDEN: {
    TITLE: 'Không đủ quyền hạn',
    DESCRIPTION: 'Bạn không có quyền thực hiện hành động này.',
    OWNER_ONLY_DESCRIPTION: 'Chỉ người sở hữu máy chủ mới có thể sử dụng lệnh này.',
    ADMIN_ONLY_DESCRIPTION: 'Chỉ người có quyền **Quản trị viên** mới có thể sử dụng lệnh này.'
  },

  DATABASE_ERROR: {
    TITLE: 'Lỗi cơ sở dữ liệu',
    DESCRIPTION: (guildId: string | null) => getErrorDescription(guildId, 'Cơ sở dữ liệu')
  },

  INTERNAL_SERVER_ERROR: {
    TITLE: 'Lỗi hệ thống',
    DESCRIPTION: (guildId: string | null) => getErrorDescription(guildId, 'Hệ thống')
  }
} as const
