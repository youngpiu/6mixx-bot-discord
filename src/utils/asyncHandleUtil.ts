import { Args, ChatInputCommand, container } from '@sapphire/framework'
import { send } from '@sapphire/plugin-editable-commands'
import {
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  ChatInputCommandInteraction,
  ContainerBuilder,
  Message,
  ModalSubmitInteraction,
  StringSelectMenuInteraction
} from 'discord.js'
import { env } from '~/config/env'

import { Prisma } from 'generated/prisma/client'

import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { ErrorResponseCore } from '~/core/errorResponse'

import { createErrorEmbed } from '~/utils/embedUtil'
import { deleteReplyInteraction } from '~/utils/interactionUtil'
import { lines } from '~/utils/textUtil'

import { GuildRepository } from '~/repositories/guildRepository'

const isPrismaError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError ||
  error instanceof Prisma.PrismaClientUnknownRequestError ||
  error instanceof Prisma.PrismaClientValidationError ||
  error instanceof Prisma.PrismaClientRustPanicError ||
  error instanceof Prisma.PrismaClientInitializationError

const sendErrorToNotificationThread = async (
  guildId: string | null,
  error: unknown,
  context?: { user?: { id: string; tag: string }; commandName?: string },
  errorType?: 'database' | 'internal'
) => {
  if (env.NODE_ENV !== 'production') return
  if (!guildId) return

  const config = await GuildRepository.getGuild(guildId)
  if (!config?.errorNotificationThreadId) return

  const guild = container.client.guilds.cache.get(guildId)
  if (!guild) return

  const thread = await guild.channels.fetch(config.errorNotificationThreadId)
  if (!thread || !thread.isThread()) return

  const errorDetails =
    error instanceof Error ? (error.stack ?? error.message ?? 'Unknown error') : String(error)

  const timestamp = `<t:${Math.floor(Date.now() / 1000)}:F> - <t:${Math.floor(Date.now() / 1000)}:R>`

  const title = errorType === 'database' ? '🔴 DATABASE ERROR 🔴' : '🔴 INTERNAL SERVER ERROR 🔴'
  const user = context?.user
  const containerComponent = new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents((t) =>
      t.setContent(
        lines(
          `## ${title}`,
          `- **Thời gian**: ${timestamp}`,
          user?.tag && `- **Người dùng**: <@${user.id}>`,
          context?.commandName && `- **Lệnh**: \`${context.commandName}\``
        )
      )
    )

  containerComponent
    .addSeparatorComponents((s) => s)
    .addTextDisplayComponents((t) =>
      t.setContent('```js\n' + errorDetails.slice(0, 3800) + '\n```')
    )

  await thread.send({
    components: [containerComponent],
    flags: ['IsComponentsV2']
  })
}

export const asyncChatInputHandler = (
  fn: (
    interaction: ChatInputCommandInteraction,
    context: ChatInputCommand.RunContext
  ) => Promise<unknown>
) => {
  return async (interaction: ChatInputCommandInteraction, context: ChatInputCommand.RunContext) => {
    try {
      return await fn(interaction, context)
    } catch (error) {
      let errorEmbed
      const guildId = interaction.guildId
      if (error instanceof ErrorResponseCore) {
        errorEmbed = createErrorEmbed({
          title: error.title,
          description: error.description
        })
      } else if (isPrismaError(error)) {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.DATABASE_ERROR.TITLE,
          description: await ERROR_MESSAGE.DATABASE_ERROR.DESCRIPTION(guildId)
        })
        await sendErrorToNotificationThread(
          guildId,
          error,
          {
            user: { id: interaction.user.id, tag: interaction.user.tag },
            commandName: interaction.commandName
          },
          'database'
        )
      } else {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.TITLE,
          description: await ERROR_MESSAGE.INTERNAL_SERVER_ERROR.DESCRIPTION(guildId)
        })
        await sendErrorToNotificationThread(
          guildId,
          error,
          {
            user: { id: interaction.user.id, tag: interaction.user.tag },
            commandName: interaction.commandName
          },
          'internal'
        )
      }

      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({
          embeds: [errorEmbed],
          allowedMentions: { users: [interaction.user.id], roles: [] }
        })
      }

      await interaction.reply({
        embeds: [errorEmbed],
        flags: ['Ephemeral'],
        allowedMentions: { users: [interaction.user.id], roles: [] }
      })

      await deleteReplyInteraction(interaction)
    }
  }
}

export const asyncMessageHandler = (fn: (message: Message, args: Args) => Promise<unknown>) => {
  return async (message: Message, args: Args) => {
    try {
      return await fn(message, args)
    } catch (error) {
      let errorEmbed
      const guildId = message.guildId
      if (error instanceof ErrorResponseCore) {
        errorEmbed = createErrorEmbed({
          title: error.title,
          description: error.description
        })
      } else if (isPrismaError(error)) {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.DATABASE_ERROR.TITLE,
          description: await ERROR_MESSAGE.DATABASE_ERROR.DESCRIPTION(guildId)
        })
        await sendErrorToNotificationThread(
          guildId,
          error,
          {
            user: { id: message.author.id, tag: message.author.tag }
          },
          'database'
        )
      } else {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.TITLE,
          description: await ERROR_MESSAGE.INTERNAL_SERVER_ERROR.DESCRIPTION(guildId)
        })
        await sendErrorToNotificationThread(
          guildId,
          error,
          {
            user: { id: message.author.id, tag: message.author.tag }
          },
          'internal'
        )
      }

      return send(message, {
        embeds: [errorEmbed],
        allowedMentions: { users: [message.author.id], roles: [] }
      })
    }
  }
}

type RepliableInteraction =
  | ButtonInteraction
  | ModalSubmitInteraction
  | StringSelectMenuInteraction
  | ChannelSelectMenuInteraction

export const asyncInteractionHandler = <T extends RepliableInteraction, R = unknown>(
  fn: (interaction: T, result?: R) => Promise<unknown>
) => {
  return async (interaction: T, result?: R) => {
    try {
      return await fn(interaction, result)
    } catch (error) {
      let errorEmbed
      const guildId = interaction.guildId

      if (error instanceof ErrorResponseCore) {
        errorEmbed = createErrorEmbed({
          title: error.title,
          description: error.description
        })
      } else if (isPrismaError(error)) {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.DATABASE_ERROR.TITLE,
          description: await ERROR_MESSAGE.DATABASE_ERROR.DESCRIPTION(guildId)
        })
        await sendErrorToNotificationThread(
          guildId,
          error,
          {
            user: { id: interaction.user.id, tag: interaction.user.tag }
          },
          'database'
        )
      } else {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.TITLE,
          description: await ERROR_MESSAGE.INTERNAL_SERVER_ERROR.DESCRIPTION(guildId)
        })
        await sendErrorToNotificationThread(
          guildId,
          error,
          {
            user: { id: interaction.user.id, tag: interaction.user.tag }
          },
          'internal'
        )
      }

      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({
          embeds: [errorEmbed],
          allowedMentions: { users: [interaction.user.id], roles: [] }
        })
      }

      await interaction.reply({
        embeds: [errorEmbed],
        flags: ['Ephemeral'],
        allowedMentions: { users: [interaction.user.id], roles: [] }
      })

      await deleteReplyInteraction(interaction)
    }
  }
}
