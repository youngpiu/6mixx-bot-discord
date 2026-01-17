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

  constructor({
    name,
    title,
    description
  }: {
    name: string
    title: string
    description: string
  }) {
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

export class InternalServerError extends ErrorResponseCore {
  constructor({
    title = ERROR_MESSAGE.INTERNAL_SERVER_ERROR.TITLE,
    description = ERROR_MESSAGE.INTERNAL_SERVER_ERROR.DESCRIPTION
  }: ErrorOptions = {}) {
    super({ name: 'INTERNAL_SERVER_ERROR', title, description })
  }
}
