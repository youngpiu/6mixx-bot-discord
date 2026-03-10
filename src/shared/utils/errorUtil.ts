import { container } from '@sapphire/framework'
import { ContainerBuilder } from 'discord.js'
import { Message } from 'discord.js'

import { Prisma } from 'generated/prisma/client'

import {
  DatabaseError,
  ErrorResponseCore,
  SystemError
} from '~/core/errorResponse'

import { LoggerBuilder } from '~/shared/components/LoggerBuilder'
import { env } from '~/shared/config/env'
import { TIME } from '~/shared/constants/timeConstant'
import { GuildRepository } from '~/shared/repositories/guildRepository'
import {
  InteractionUtil,
  MessageUtil,
  type RepliableInteraction
} from '~/shared/utils/messageUtil'

// ─── Types ───────────────────────────────────────────────────────────────────

type ErrorContext = {
  user?: { id: string; tag: string }
  commandName?: string
}

type ErrorType = 'database' | 'internal'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isPrismaError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError ||
  error instanceof Prisma.PrismaClientUnknownRequestError ||
  error instanceof Prisma.PrismaClientValidationError ||
  error instanceof Prisma.PrismaClientRustPanicError ||
  error instanceof Prisma.PrismaClientInitializationError

const resolveUserTag = (user: {
  id: string
  username?: string
  tag?: string
}): { id: string; tag: string } => ({
  id: user.id,
  tag:
    'username' in user && user.username
      ? user.username
      : (user.tag ?? 'Unknown')
})

const buildErrorEmbed = (
  error: unknown,
  context: ErrorContext,
  errorType: ErrorType
): ContainerBuilder => {
  const nowSec = Math.floor(Date.now() / 1000)
  const timestamp = `<t:${nowSec}:R>`
  const title =
    errorType === 'database'
      ? '🔴 DATABASE ERROR 🔴'
      : '🔴 INTERNAL SERVER ERROR 🔴'
  const errorDetails =
    error instanceof Error ? (error.stack ?? error.message) : String(error)
  const { user } = context

  const logger = new LoggerBuilder({ title }).addFields([
    ['Time', timestamp],
    ...(user?.tag ? [['User', `<@${user.id}>`] as [string, string]] : []),
    ...(context.commandName
      ? [['Command', `\`${context.commandName}\``] as [string, string]]
      : [])
  ])

  const container = logger.getContainer()
  container.addSeparatorComponents((s) => s)
  container.addTextDisplayComponents((t) =>
    t.setContent('```js\n' + errorDetails.slice(0, 3800) + '\n```')
  )

  return container
}

// ─── Notification ─────────────────────────────────────────────────────────────

export const sendErrorToNotificationThread = async (
  guildId: string | null,
  error: unknown,
  context: ErrorContext = {},
  errorType: ErrorType = 'internal'
): Promise<void> => {
  if (env.NODE_ENV !== 'production' || !guildId) return

  const config = await GuildRepository.findUnique(guildId)
  if (!config?.errorNotificationThreadId) return

  const guild = container.client.guilds.cache.get(guildId)
  if (!guild) return

  const thread = await guild.channels.fetch(config.errorNotificationThreadId)
  if (!thread?.isThread()) return

  const embed = buildErrorEmbed(error, context, errorType)
  await MessageUtil.sendWithContainer(thread, embed)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function handleError(
  target: RepliableInteraction | Message | null | undefined,
  error: unknown,
  commandName?: string
): Promise<void> {
  const guildId = target?.guild?.id ?? null
  const rawUser =
    target instanceof Message
      ? target.author
      : (target?.user ?? { id: 'SYSTEM', tag: 'Unknown' })

  const user = resolveUserTag(rawUser)

  let errorResponse: ErrorResponseCore

  if (error instanceof ErrorResponseCore) {
    errorResponse = error
  } else if (isPrismaError(error)) {
    container.logger.error(error)
    await sendErrorToNotificationThread(
      guildId,
      error,
      { user, commandName },
      'database'
    )
    errorResponse = new DatabaseError()
  } else {
    container.logger.error(error)
    await sendErrorToNotificationThread(
      guildId,
      error,
      { user, commandName },
      'internal'
    )
    errorResponse = new SystemError()
  }

  if (!target) return

  if (target instanceof Message) {
    await MessageUtil.replyError(
      target,
      errorResponse.content,
      TIME.S15,
      errorResponse.type
    )
  } else {
    await InteractionUtil.replyError(
      target,
      errorResponse.content,
      errorResponse.type
    )
  }
}
