export const RANDOM_LOADING_MESSAGES: string[] = [
  'Đang xử lý...',
  'Đang tải...',
  'Đợi mình tí...',
  'Đang nấu...',
  'Đợi xíu...'
]

export const ERROR_MESSAGE = {
  NO_PERMISSION: {
    TITLE: 'Không đủ quyền hạn',
    DESCRIPTION: {
      OWNER_ONLY: 'Lệnh này chỉ chủ sở hữu máy chủ mới được phép sử dụng.',
      MANAGER_ONLY: 'Lệnh này chỉ quản lý máy chủ mới được phép sử dụng.',
      MESSAGE_MANAGER_ONLY:
        'Lệnh này chỉ thành viên có quyền **Quản lý tin nhắn** mới được phép sử dụng.'
    }
  }
} as const
