/**
 * Categorization of common bot error types.
 * Used for determining which icon and logging logic to apply.
 */
export type ErrorType =
  | 'DATABASE'
  | 'SYSTEM'
  | 'RATE_LIMIT'
  | 'PERMISSION'
  | 'BANNED'
  | 'NORMAL'

/**
 * Base class for custom bot error responses.
 * Extends the native {@link Error} class and includes an error type and specific content message.
 */
export class ErrorResponseCore extends Error {
  /** The category of the error. */
  public readonly type: ErrorType
  /** The human-readable error message to be displayed to the user. */
  public readonly content: string

  /**
   * Initializes a new ErrorResponseCore.
   *
   * @param type - The category of the error.
   * @param content - The message content for the error.
   */
  constructor(type: ErrorType, content: string) {
    super(content)
    this.type = type
    this.content = content
  }
}

/**
 * Represents an error originating from a database failure.
 */
export class DatabaseError extends ErrorResponseCore {
  /**
   * @param content - Custom error message (default: generic Vietnamese database failure message).
   */
  constructor(
    content: string = 'Cơ sở dữ liệu đã gặp sự cố, vui lòng gửi **phiếu báo lỗi** hoặc liên hệ với **Ban Quản Lý** để có thể khắc phục sớm nhất.'
  ) {
    super('DATABASE', content)
  }
}

/**
 * Represents a generic system or internal server error.
 */
export class SystemError extends ErrorResponseCore {
  /**
   * @param content - Custom error message (default: generic Vietnamese system failure message).
   */
  constructor(
    content: string = 'Hệ thống đã gặp sự cố, vui lòng gửi **phiếu báo lỗi** hoặc liên hệ với **Ban Quản Lý** để có thể khắc phục sớm nhất.'
  ) {
    super('SYSTEM', content)
  }
}

/**
 * Represents a rate limit error (spamming/too many requests).
 */
export class RateLimitError extends ErrorResponseCore {
  /**
   * @param content - Custom error message (default: generic Vietnamese rate limit message).
   */
  constructor(
    content: string = 'Bạn đang thao tác quá nhanh, vui lòng chờ một chút.'
  ) {
    super('RATE_LIMIT', content)
  }
}

/**
 * Represents an error where the user lacks sufficient permissions.
 */
export class PermissionError extends ErrorResponseCore {
  /**
   * @param content - Custom error message (default: generic Vietnamese permission error message).
   */
  constructor(
    content: string = 'Bạn không có đủ quyền để thực hiện hành động này.'
  ) {
    super('PERMISSION', content)
  }
}

/**
 * Represents an error for users who are currently banned from a feature.
 */
export class BannedError extends ErrorResponseCore {
  /**
   * @param content - Custom error message (default: generic Vietnamese ban message).
   */
  constructor(content: string = 'Bạn đã bị cấm sử dụng tính năng này.') {
    super('BANNED', content)
  }
}

/**
 * Represents a standard error for expected validation failures or logic issues.
 */
export class NormalError extends ErrorResponseCore {
  /**
   * @param content - Custom error message (default: generic Vietnamese normal error message).
   */
  constructor(
    content: string = 'Không thể thực hiện yêu cầu của bạn, vui lòng thử lại sau.'
  ) {
    super('NORMAL', content)
  }
}
