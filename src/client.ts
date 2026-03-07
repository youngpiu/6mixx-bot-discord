import {
  ApplicationCommandRegistries,
  LogLevel,
  RegisterBehavior,
  SapphireClient,
  container
} from '@sapphire/framework'
import { getRootData } from '@sapphire/pieces'
import { ActivityType, GatewayIntentBits, Partials } from 'discord.js'
import { join } from 'node:path'
import { env } from '~/config/env'

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
      partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
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

    this.stores.get('interaction-handlers').registerPath(join(this.rootData.root, 'interactions'))
  }

  async login(token: string): Promise<string> {
    ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite)
    ApplicationCommandRegistries.setDefaultGuildIds(env.TEST_GUILDS_ID)

    container.prisma = prisma
    container.redis = redis
    return super.login(token)
  }
}
