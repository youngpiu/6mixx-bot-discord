import { Client, GatewayIntentBits } from 'discord.js'
import 'dotenv/config'

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const GUILD_ID = '1453369856274600181' // không bao giờ được thay đổi

if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing in .env')
  process.exit(1)
}

if (!GUILD_ID) {
  console.error('❌ GUILD_ID is missing (MAIN_DISCORD_GUILD_ID or TEST_DISCORD_GUILD_ID)')
  process.exit(1)
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user?.tag}`)

  try {
    const guild = await client.guilds.fetch(GUILD_ID)
    if (!guild) {
      console.error(`❌ Guild not found with ID: ${GUILD_ID}`)
      process.exit(1)
    }

    console.log(`⚠️  Starting to delete all channels in guild: ${guild.name} (${guild.id})`)

    const channels = await guild.channels.fetch()

    // Use a loop to delete channels one by one to avoid rate limits issues
    // and ensuring categories are deleted if needed, though deleting children is usually enough.
    // However, discord.js fetch returns all channels including categories.

    for (const [id, channel] of channels) {
      if (!channel) continue
      try {
        await channel.delete()
        console.log(`🗑️  Deleted channel: ${channel.name} (${id})`)
      } catch (err) {
        console.error(
          `❌ Failed to delete channel ${channel.name}:`,
          err instanceof Error ? err.message : err
        )
      }
    }

    console.log('✨ All possible channels have been processed.')
  } catch (error) {
    console.error('❌ An error occurred:', error)
  } finally {
    client.destroy()
    process.exit(0)
  }
})

client.login(DISCORD_TOKEN)
