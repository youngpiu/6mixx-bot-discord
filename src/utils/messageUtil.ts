import type {
  ChatInputCommandSuccessPayload,
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

export function sendLoadingMessage(message: Message): Promise<typeof message> {
  const randomMessage =
    RANDOM_LOADING_MESSAGES[
      Math.floor(Math.random() * RANDOM_LOADING_MESSAGES.length)
    ]

  return reply(message, {
    embeds: [
      new EmbedBuilder()
        .setDescription(randomMessage)
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
  let guild: Guild | null
  let user: User | APIUser
  let subcommandName: string | null = null

  if ('interaction' in payload && payload.interaction) {
    guild = payload.interaction.guild
    user = payload.interaction.user

    if (payload.interaction.isChatInputCommand()) {
      subcommandName = payload.interaction.options.getSubcommand(false)
    }
  } else if ('message' in payload && payload.message) {
    guild = payload.message.guild
    user = payload.message.author
  } else {
    return
  }

  const shard = `[${cyan((guild?.shardId ?? 0).toString())}]`
  const commandName = cyan(
    subcommandName
      ? `${payload.command.name} ${subcommandName}`
      : payload.command.name
  )
  const author = `${user.username}[${cyan(user.id)}]`
  const sentAt = guild ? `${guild.name}[${cyan(guild.id)}]` : 'Direct Messages'

  container.logger.debug(`${shard} - ${commandName} ${author} ${sentAt}`)
}
