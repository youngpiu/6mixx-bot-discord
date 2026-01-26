import '@sapphire/plugin-editable-commands/register'
import '@sapphire/plugin-logger/register'
import '@sapphire/plugin-subcommands/register'
import 'dotenv/config'
import { BotClient } from '~/client'
import { env } from '~/config/env'

const client = new BotClient()

client.login(env.DISCORD_TOKEN).catch((error) => {
  console.error('Failed to start bot:', error)
  process.exit(1)
})
