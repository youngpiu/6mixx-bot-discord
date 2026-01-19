import { Args, ChatInputCommand, container } from '@sapphire/framework'
import { send } from '@sapphire/plugin-editable-commands'
import {
  AutocompleteInteraction,
  ButtonInteraction,
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

      if (error instanceof ErrorResponseCore) {
        errorEmbed = createErrorEmbed({
          title: error.title,
          description: error.description
        })
      } else if (isPrismaError(error)) {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.DATABASE_ERROR.TITLE,
          description: ERROR_MESSAGE.DATABASE_ERROR.DESCRIPTION
        })
      } else {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.TITLE,
          description: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.DESCRIPTION
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

      if (error instanceof ErrorResponseCore) {
        errorEmbed = createErrorEmbed({
          title: error.title,
          description: error.description
        })
      } else if (isPrismaError(error)) {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.DATABASE_ERROR.TITLE,
          description: ERROR_MESSAGE.DATABASE_ERROR.DESCRIPTION
        })
      } else {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.TITLE,
          description: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.DESCRIPTION
        })
      }

      return send(message, {
        embeds: [errorEmbed],
        allowedMentions: { users: [message.author.id], roles: [] }
      })
    }
  }
}

type RepliableInteraction = ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction

export const asyncInteractionHandler = <T extends RepliableInteraction>(
  fn: (interaction: T) => Promise<unknown>
) => {
  return async (interaction: T) => {
    try {
      return await fn(interaction)
    } catch (error) {
      let errorEmbed

      if (error instanceof ErrorResponseCore) {
        errorEmbed = createErrorEmbed({
          title: error.title,
          description: error.description
        })
      } else if (isPrismaError(error)) {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.DATABASE_ERROR.TITLE,
          description: ERROR_MESSAGE.DATABASE_ERROR.DESCRIPTION
        })
      } else {
        container.logger.error(error)
        errorEmbed = createErrorEmbed({
          title: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.TITLE,
          description: ERROR_MESSAGE.INTERNAL_SERVER_ERROR.DESCRIPTION
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
