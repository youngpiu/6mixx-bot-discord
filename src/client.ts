import {
  ApplicationCommandRegistries,
  container,
  LogLevel,
  RegisterBehavior,
  SapphireClient
} from '@sapphire/framework'
import { getRootData } from '@sapphire/pieces'
import { GatewayIntentBits } from 'discord.js'
import { join } from 'node:path'
import { env } from '~/config/env'
import prisma from '~/lib/prisma'
import redis from '~/lib/redis'
import { gracefulShutdown } from '~/utils/shutdownUtil'

export class BotClient extends SapphireClient {
  private rootData = getRootData()

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

    this.stores
      .get('interaction-handlers')
      .registerPath(join(this.rootData.root, 'interactions'))

    process.on('SIGINT', () => gracefulShutdown(this))
    process.on('SIGTERM', () => gracefulShutdown(this))
  }

  async login(token: string): Promise<string> {
    ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
      RegisterBehavior.BulkOverwrite
    )
    ApplicationCommandRegistries.setDefaultGuildIds([
      env.MAIN_DISCORD_GUILD_ID,
      env.TEST_DISCORD_GUILD_ID
    ])

    container.prisma = prisma
    container.redis = redis
    return super.login(token)
  }
}
