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
    DESCRIPTION: 'Yêu cầu không hợp lệ'
  },

  NOT_FOUND: {
    TITLE: 'Không tìm thấy',
    DESCRIPTION: 'Không tìm thấy'
  },

  FORBIDDEN: {
    TITLE: 'Không được phép',
    DESCRIPTION: 'Không được phép'
  },
  DATABASE_ERROR: {
    TITLE: 'Lỗi cơ sở dữ liệu',
    DESCRIPTION:
      'Có lỗi xảy ra với cơ sở dữ liệu, vui lòng thử lại hoặc liên hệ với **Quản trị viên** để được hỗ trợ.'
  },

  INTERNAL_SERVER_ERROR: {
    TITLE: 'Lỗi không xác định',
    DESCRIPTION:
      'Có lỗi xảy ra với hệ thống, vui lòng thử lại hoặc liên hệ với **Quản trị viên** để được hỗ trợ.'
  }
} as const
