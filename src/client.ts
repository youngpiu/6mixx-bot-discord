import {
  ApplicationCommandRegistries,
  container,
  LogLevel,
  RegisterBehavior,
  SapphireClient
} from '@sapphire/framework'
import { GatewayIntentBits } from 'discord.js'
import { env } from '~/config/env'
import prisma from '~/lib/prisma'
import redis from '~/lib/redis'
import { gracefulShutdown } from '~/utils/shutdown'

export class BotClient extends SapphireClient {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ],
      defaultPrefix: env.DEFAULT_PREFIX,
      loadMessageCommandListeners: true,

      logger: {
        level: env.NODE_ENV === 'development' ? LogLevel.Debug : LogLevel.Info
      }
    })

    process.on('SIGINT', () => gracefulShutdown(this))
    process.on('SIGTERM', () => gracefulShutdown(this))
  }

  async login(token: string): Promise<string> {
    ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
      RegisterBehavior.BulkOverwrite
    )
    ApplicationCommandRegistries.setDefaultGuildIds([env.DISCORD_GUILD_ID])

    container.prisma = prisma
    container.redis = redis
    return super.login(token)
  }
}
