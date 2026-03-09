// Categorization of common bot error types
export type ErrorType =
  | 'DATABASE'
  | 'SYSTEM'
  | 'RATE_LIMIT'
  | 'PERMISSION'
  | 'BANNED'
  | 'NORMAL'

// Base class for custom bot error responses
export class ErrorResponseCore extends Error {
  public readonly type: ErrorType
  public readonly content: string

  constructor(type: ErrorType, content: string) {
    super(content)
    this.type = type
    this.content = content
  }
}

export class DatabaseError extends ErrorResponseCore {
  constructor(
    content: string = 'Cơ sở dữ liệu đã gặp sự cố, vui lòng gửi **phiếu báo lỗi** hoặc liên hệ với **Ban Quản Lý** để có thể khắc phục sớm nhất.'
  ) {
    super('DATABASE', content)
  }
}

export class SystemError extends ErrorResponseCore {
  constructor(
    content: string = 'Hệ thống đã gặp sự cố, vui lòng gửi **phiếu báo lỗi** hoặc liên hệ với **Ban Quản Lý** để có thể khắc phục sớm nhất.'
  ) {
    super('SYSTEM', content)
  }
}

export class RateLimitError extends ErrorResponseCore {
  constructor(
    content: string = 'Bạn đang thao tác quá nhanh, vui lòng chờ một chút.'
  ) {
    super('RATE_LIMIT', content)
  }
}

export class PermissionError extends ErrorResponseCore {
  constructor(
    content: string = 'Bạn không có đủ quyền để thực hiện hành động này.'
  ) {
    super('PERMISSION', content)
  }
}

export class BannedError extends ErrorResponseCore {
  constructor(content: string = 'Bạn đã bị cấm sử dụng tính năng này.') {
    super('BANNED', content)
  }
}

export class NormalError extends ErrorResponseCore {
  constructor(
    content: string = 'Không thể thực hiện yêu cầu của bạn, vui lòng thử lại sau.'
  ) {
    super('NORMAL', content)
  }
}
