import {
  ApplicationCommandRegistries,
  LogLevel,
  RegisterBehavior,
  SapphireClient,
  container
} from '@sapphire/framework'
import '@sapphire/plugin-editable-commands/register'
import '@sapphire/plugin-logger/register'
import '@sapphire/plugin-scheduled-tasks'
import '@sapphire/plugin-scheduled-tasks/register'
import '@sapphire/plugin-subcommands/register'
import { GatewayIntentBits, Partials } from 'discord.js'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import prisma from '~/lib/prisma'
import redis from '~/lib/redis'

import { env } from '~/shared/config/env'

/**
 * The core client class for the Discord bot, extending the Sapphire framework's SapphireClient.
 * Responsible for configuring intents, partials, plugins, and registering feature modules.
 */
export class BotClient extends SapphireClient {
  private runtimeRoot = dirname(fileURLToPath(import.meta.url))

  /**
   * Initializes a new instance of the BotClient.
   * Configures Discord gateaway intents, partials, default cooldowns, and logging.
   * Also dynamically registers command and listener paths from the modules and shared directories.
   */
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
    const modulesDir = join(this.runtimeRoot, 'modules')
    if (existsSync(modulesDir)) {
      const modules = readdirSync(modulesDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)

      for (const module of modules) {
        this.stores.registerPath(join(modulesDir, module))
      }
    }

    // Register shared pieces (listeners, preconditions)
    this.stores.registerPath(join(this.runtimeRoot, 'shared'))
  }

  /**
   * Overrides the login method to perform additional initialization before connecting to Discord.
   * Sets the default behavior for application command registries, connects to Prisma and Redis,
   * and starts the client login process.
   *
   * @param token - The Discord bot token.
   * @returns A promise that resolves to the client's token when login is successful.
   */
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
