import type {
  ChatInputCommandSuccessPayload,
  Command,
  ContextMenuCommandSuccessPayload,
  MessageCommandSuccessPayload
} from '@sapphire/framework'
import type {
  ChatInputSubcommandSuccessPayload,
  MessageSubcommandSuccessPayload
} from '@sapphire/plugin-subcommands'
import { container } from '@sapphire/framework'
import { reply } from '@sapphire/plugin-editable-commands'
import { cyan } from 'colorette'
import {
  EmbedBuilder,
  type APIUser,
  type Guild,
  type Message,
  type User
} from 'discord.js'
import { RGB_COLOR_TEMPLATE } from '~/constants/colorConstant'
import { RANDOM_LOADING_MESSAGES } from '~/constants/messageConstant'

export function pickRandom<T>(array: readonly T[]): T {
  const { length } = array
  return array[Math.floor(Math.random() * length)]
}

export function sendLoadingMessage(message: Message): Promise<typeof message> {
  return reply(message, {
    embeds: [
      new EmbedBuilder()
        .setDescription(pickRandom(RANDOM_LOADING_MESSAGES))
        .setColor(RGB_COLOR_TEMPLATE.SUCCESS)
    ]
  })
}

export function logSuccessCommand(
  payload:
    | ContextMenuCommandSuccessPayload
    | ChatInputCommandSuccessPayload
    | MessageCommandSuccessPayload
    | ChatInputSubcommandSuccessPayload
    | MessageSubcommandSuccessPayload
): void {
  let successLoggerData: ReturnType<typeof getSuccessLoggerData>

  if ('interaction' in payload && payload.interaction) {
    successLoggerData = getSuccessLoggerData(
      payload.interaction.guild,
      payload.interaction.user,
      payload.command
    )
  } else if ('message' in payload && payload.message) {
    successLoggerData = getSuccessLoggerData(
      payload.message.guild,
      payload.message.author,
      payload.command
    )
  } else {
    return
  }

  container.logger.debug(
    `${successLoggerData.shard} - ${successLoggerData.commandName} ${successLoggerData.author} ${successLoggerData.sentAt}`
  )
}

export function getSuccessLoggerData(
  guild: Guild | null,
  user: User,
  command: Command
) {
  const shard = getShardInfo(guild?.shardId ?? 0)
  const commandName = getCommandInfo(command)
  const author = getAuthorInfo(user)
  const sentAt = getGuildInfo(guild)

  return { shard, commandName, author, sentAt }
}

function getShardInfo(id: number) {
  return `[${cyan(id.toString())}]`
}

function getCommandInfo(command: Command) {
  return cyan(command.name)
}

function getAuthorInfo(author: User | APIUser) {
  return `${author.username}[${cyan(author.id)}]`
}

function getGuildInfo(guild: Guild | null) {
  if (guild === null) return 'Direct Messages'
  return `${guild.name}[${cyan(guild.id)}]`
}
