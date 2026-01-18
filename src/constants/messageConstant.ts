export const RANDOM_LOADING_MESSAGES: string[] = [
  'Đang xử lý...',
  'Đang tải...',
  'Đợi mình tí...',
  'Đang nấu...',
  'Đợi xíu...'
]

export const ERROR_MESSAGE = {
  BAD_REQUEST: {
    TITLE: 'Yêu cầu không hợp lệ',
    DESCRIPTION: 'Yêu cầu không hợp lệ',
    GUILD_ONLY_DESCRIPTION: 'Lệnh này chỉ có thể sử dụng trong máy chủ.',
    TICKET_CONFIG_NOT_FOUND_DESCRIPTION:
      'Cấu hình hệ thống hỗ trợ thành viên chưa được thiết lập.',
    THREAD_NOT_FOUND_DESCRIPTION:
      'Không tìm thấy phiếu hỗ trợ trong máy chủ **VNMIXX**.'
  },

  NOT_FOUND: {
    TITLE: 'Không tìm thấy',
    DESCRIPTION: 'Không tìm thấy'
  },

  FORBIDDEN: {
    TITLE: 'Không được phép',
    DESCRIPTION: 'Không được phép',
    OWNER_ONLY_DESCRIPTION:
      'Chỉ người sở hữu máy chủ mới có thể sử dụng lệnh này.'
  },
  DATABASE_ERROR: {
    TITLE: 'Lỗi cơ sở dữ liệu',
    DESCRIPTION:
      'Có lỗi xảy ra với cơ sở dữ liệu, vui lòng thử lại hoặc liên hệ với **Ban Quản Lý** để được hỗ trợ.'
  },

  INTERNAL_SERVER_ERROR: {
    TITLE: 'Lỗi không xác định',
    DESCRIPTION:
      'Có lỗi xảy ra với hệ thống, vui lòng thử lại hoặc liên hệ với **Ban Quản Lý** để được hỗ trợ.'
  }
} as const
