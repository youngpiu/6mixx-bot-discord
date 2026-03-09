import {
  ApplicationCommandRegistries,
  LogLevel,
  RegisterBehavior,
  SapphireClient,
  container
} from '@sapphire/framework'
import { getRootData } from '@sapphire/pieces'
import '@sapphire/plugin-editable-commands/register'
import '@sapphire/plugin-logger/register'
import '@sapphire/plugin-scheduled-tasks'
import '@sapphire/plugin-scheduled-tasks/register'
import '@sapphire/plugin-subcommands/register'
import { ActivityType, GatewayIntentBits, Partials } from 'discord.js'
import 'dotenv/config'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { env } from '~/shared/config/env'

import prisma from '~/lib/prisma'
import redis from '~/lib/redis'

export class BotClient extends SapphireClient {
  private rootData = getRootData()

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User
      ],
      presence: {
        status: 'online',
        activities: [
          {
            name: 'NMIXX',
            type: ActivityType.Listening
          }
        ]
      },
      loadDefaultErrorListeners: false,
      defaultPrefix: env.DEFAULT_PREFIX,
      loadMessageCommandListeners: true,
      typing: true,
      caseInsensitiveCommands: true,
      caseInsensitivePrefixes: true,
      defaultCooldown: {
        limit: 1,
        delay: 2000,
        scope: 3
      },
      subcommandDefaultCooldown: {
        limit: 1,
        delay: 2000,
        scope: 3
      },

      logger: {
        level: env.NODE_ENV === 'development' ? LogLevel.Debug : LogLevel.Info
      },
      tasks: {
        bull: {
          connection: redis,
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true
          },
          streams: {
            events: {
              maxLen: 1000
            }
          }
        }
      }
    })

    // Register all feature modules
    const modulesDir = join(this.rootData.root, 'modules')
    if (existsSync(modulesDir)) {
      const modules = readdirSync(modulesDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)

      for (const module of modules) {
        this.logger.info(`Registering module paths for: ${module}`)
        this.stores.registerPath(join(modulesDir, module))
      }
    }

    // Register shared pieces (listeners, preconditions)
    this.logger.info('Registering shared pieces path')
    this.stores.registerPath(join(this.rootData.root, 'shared'))
  }

  async login(token: string): Promise<string> {
    ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
      RegisterBehavior.BulkOverwrite
    )
    ApplicationCommandRegistries.setDefaultGuildIds(env.TEST_GUILDS_ID)

    container.prisma = prisma
    container.redis = redis
    return super.login(token)
  }
}

const client = new BotClient()

client.login(env.DISCORD_TOKEN).catch((error) => {
  console.error('Failed to start bot:', error)
  process.exit(1)
})
