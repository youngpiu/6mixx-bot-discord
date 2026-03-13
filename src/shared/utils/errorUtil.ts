import { container } from '@sapphire/framework'
import { ContainerBuilder } from 'discord.js'
import { Message } from 'discord.js'

import { Prisma } from 'generated/prisma/client'

import {
  DatabaseError,
  ErrorResponseCore,
  SystemError
} from '~/core/errorResponse'

import { env } from '~/shared/config/env'
import { TIME } from '~/shared/constants/timeConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'
import {
  InteractionUtil,
  MessageUtil,
  type RepliableInteraction
} from '~/shared/utils/messageUtil'
import { formatFields, lines } from '~/shared/utils/textUtil'

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Contextual information about where an error occurred.
 */
type ErrorContext = {
  /** The user who triggered the error. */
  user?: { id: string; tag: string }
  /** The name of the command being executed when the error occurred. */
  commandName?: string
}

/**
 * Categorization of the error for reporting purposes.
 */
type ErrorType = 'database' | 'internal'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Checks if the given error is a Prisma-related error.
 *
 * @param error - The error to check.
 * @returns True if it's a Prisma error, false otherwise.
 */
const isPrismaError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError ||
  error instanceof Prisma.PrismaClientUnknownRequestError ||
  error instanceof Prisma.PrismaClientValidationError ||
  error instanceof Prisma.PrismaClientRustPanicError ||
  error instanceof Prisma.PrismaClientInitializationError

/**
 * Resolves a user's ID and tag from various user object formats.
 *
 * @param user - The user object to resolve.
 * @returns An object containing the user's ID and tag.
 */
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

/**
 * Builds a standardized error embed for reporting.
 *
 * @param error - The error to report.
 * @param context - The context in which the error occurred.
 * @param errorType - The type of error.
 * @returns A ContainerBuilder configured with the error details.
 */
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

  const fields: [string, string][] = [['Time', timestamp]]
  if (user?.tag) fields.push(['User', `<@${user.id}>`])
  if (context.commandName)
    fields.push(['Command', `\`${context.commandName}\``])

  return new ContainerBuilder()
    .addTextDisplayComponents((t) => t.setContent(`### ${title}`))
    .addSeparatorComponents((s) => s)
    .addTextDisplayComponents((t) =>
      t.setContent(lines(...formatFields(fields, '- ')))
    )
    .addSeparatorComponents((s) => s)
    .addTextDisplayComponents((t) =>
      t.setContent('```js\n' + errorDetails.slice(0, 3800) + '\n```')
    )
}

// ─── Notification ─────────────────────────────────────────────────────────────

/**
 * Sends a detailed error report to the configured notification thread in a guild.
 * Only sends in production and if the guild has an error notification thread configured.
 *
 * @param guildId - The ID of the guild where the error occurred.
 * @param error - The error object or message to report.
 * @param context - Additional context about the error.
 * @param errorType - The category of the error.
 * @returns A promise that resolves when the notification is sent.
 */
export const sendErrorToNotificationThread = async (
  guildId: string | null,
  error: unknown,
  context: ErrorContext = {},
  errorType: ErrorType = 'internal'
): Promise<void> => {
  if (env.NODE_ENV !== 'production' || !guildId) return

  const config = await SettingRepository.find(guildId)
  if (!config?.errorNotificationThreadId) return

  const guild = container.client.guilds.cache.get(guildId)
  if (!guild) return

  const thread = await guild.channels.fetch(config.errorNotificationThreadId)
  if (!thread?.isThread()) return

  const embed = buildErrorEmbed(error, context, errorType)
  await MessageUtil.sendWithContainer(thread, embed)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * Handles an error by logging it, notifying the error thread (if applicable),
 * and replying to the user with a standardized error message.
 *
 * @param target - The interaction or message to reply to.
 * @param error - The error that occurred.
 * @param commandName - The name of the command that was running.
 * @returns A promise that resolves when error handling is complete.
 */
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
