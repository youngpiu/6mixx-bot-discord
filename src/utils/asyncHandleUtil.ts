import { Args, ChatInputCommand, container } from '@sapphire/framework'
import { send } from '@sapphire/plugin-editable-commands'
import {
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  ChatInputCommandInteraction,
  Message,
  ModalSubmitInteraction,
  StringSelectMenuInteraction
} from 'discord.js'

import { Prisma } from 'generated/prisma/client'

import { ERROR_MESSAGE } from '~/constants/messageConstant'
import { ErrorResponseCore } from '~/core/errorResponse'

import { createErrorEmbed } from '~/utils/embedUtil'

const isPrismaError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError ||
  error instanceof Prisma.PrismaClientUnknownRequestError ||
  error instanceof Prisma.PrismaClientValidationError ||
  error instanceof Prisma.PrismaClientRustPanicError ||
  error instanceof Prisma.PrismaClientInitializationError

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
      } else {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.TITLE,
          description: await ERROR_MESSAGE.INTERNAL_SERVER_ERROR.DESCRIPTION(guildId)
        })
      }

      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({
          embeds: [errorEmbed],
          allowedMentions: { users: [interaction.user.id], roles: [] }
        })
      }

      return interaction.reply({
        embeds: [errorEmbed],
        flags: ['Ephemeral'],
        allowedMentions: { users: [interaction.user.id], roles: [] }
      })
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
      } else {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.TITLE,
          description: await ERROR_MESSAGE.INTERNAL_SERVER_ERROR.DESCRIPTION(guildId)
        })
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
      } else {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.TITLE,
          description: await ERROR_MESSAGE.INTERNAL_SERVER_ERROR.DESCRIPTION(guildId)
        })
      }

      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({
          embeds: [errorEmbed],
          allowedMentions: { users: [interaction.user.id], roles: [] }
        })
      }

      return interaction.reply({
        embeds: [errorEmbed],
        flags: ['Ephemeral'],
        allowedMentions: { users: [interaction.user.id], roles: [] }
      })
    }
  }
}
