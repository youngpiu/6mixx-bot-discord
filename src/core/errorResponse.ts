import { ERROR_MESSAGE } from '~/constants/messageConstant'

type ErrorOptions = {
  title?: string
  description?: string
}

export class ErrorResponseCore extends Error {
  public name: string
  public title: string
  public description: string
  public timestamp: string

  constructor({ name, title, description }: { name: string; title: string; description: string }) {
    super(title)
    this.name = name
    this.title = title
    this.description = description
    this.timestamp = new Date().toISOString()
  }
}

export class BadRequestError extends ErrorResponseCore {
  constructor({
    title = ERROR_MESSAGE.BAD_REQUEST.TITLE,
    description = ERROR_MESSAGE.BAD_REQUEST.DESCRIPTION
  }: ErrorOptions = {}) {
    super({ name: 'BAD_REQUEST', title, description })
  }
}

export class NotFoundError extends ErrorResponseCore {
  constructor({
    title = ERROR_MESSAGE.NOT_FOUND.TITLE,
    description = ERROR_MESSAGE.NOT_FOUND.DESCRIPTION
  }: ErrorOptions = {}) {
    super({ name: 'NOT_FOUND', title, description })
  }
}

export class ForbiddenError extends ErrorResponseCore {
  constructor({
    title = ERROR_MESSAGE.FORBIDDEN.TITLE,
    description = ERROR_MESSAGE.FORBIDDEN.DESCRIPTION
  }: ErrorOptions = {}) {
    super({ name: 'FORBIDDEN', title, description })
  }
}

export class GuildOnlyError extends ErrorResponseCore {
  constructor({
    title = ERROR_MESSAGE.BAD_REQUEST.TITLE,
    description = ERROR_MESSAGE.BAD_REQUEST.GUILD_ONLY_DESCRIPTION
  }: ErrorOptions = {}) {
    super({ name: 'GUILD_ONLY', title, description })
  }
}

export class AdministratorOnlyError extends ErrorResponseCore {
  constructor({
    title = ERROR_MESSAGE.FORBIDDEN.TITLE,
    description = ERROR_MESSAGE.FORBIDDEN.ADMIN_ONLY_DESCRIPTION
  }: ErrorOptions = {}) {
    super({ name: 'ADMINISTRATOR_ONLY', title, description })
  }
}

export class OwnerOnlyError extends ErrorResponseCore {
  constructor({
    title = ERROR_MESSAGE.FORBIDDEN.TITLE,
    description = ERROR_MESSAGE.FORBIDDEN.OWNER_ONLY_DESCRIPTION
  }: ErrorOptions = {}) {
    super({ name: 'OWNER_ONLY', title, description })
  }
}

export class ManageMessagesOnlyError extends ErrorResponseCore {
  constructor({
    title = ERROR_MESSAGE.FORBIDDEN.TITLE,
    description = ERROR_MESSAGE.FORBIDDEN.MANAGE_MESSAGES_ONLY_DESCRIPTION
  }: ErrorOptions = {}) {
    super({ name: 'MANAGE_MESSAGES_ONLY', title, description })
  }
}

export class ManageChannelsOnlyError extends ErrorResponseCore {
  constructor({
    title = ERROR_MESSAGE.FORBIDDEN.TITLE,
    description = ERROR_MESSAGE.FORBIDDEN.MANAGE_CHANNELS_ONLY_DESCRIPTION
  }: ErrorOptions = {}) {
    super({ name: 'MANAGE_CHANNELS_ONLY', title, description })
  }
}

export class ManageRolesOnlyError extends ErrorResponseCore {
  constructor({
    title = ERROR_MESSAGE.FORBIDDEN.TITLE,
    description = ERROR_MESSAGE.FORBIDDEN.MANAGE_ROLES_ONLY_DESCRIPTION
  }: ErrorOptions = {}) {
    super({ name: 'MANAGE_ROLES_ONLY', title, description })
  }
}

type NotConfiguredErrorOptions = ErrorOptions & {
  featureName?: string
}

export class NotConfiguredError extends ErrorResponseCore {
  public featureName: string

  constructor({
    title = ERROR_MESSAGE.NOT_CONFIGURED.TITLE,
    description = 'Tính năng này chưa được thiết lập.',
    featureName = 'Tính năng này'
  }: NotConfiguredErrorOptions = {}) {
    super({ name: 'NOT_CONFIGURED', title, description })
    this.featureName = featureName
  }
}
