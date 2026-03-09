import {
  ChatInputCommandSuccessPayload,
  ContextMenuCommandSuccessPayload,
  MessageCommandSuccessPayload
} from '@sapphire/framework'
import { container } from '@sapphire/pieces'
import {
  ChatInputSubcommandSuccessPayload,
  MessageSubcommandSuccessPayload
} from '@sapphire/plugin-subcommands'
import { cyan } from 'colorette'
import { APIUser, Guild, User } from 'discord.js'

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
