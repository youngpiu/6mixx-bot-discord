import { Client, GatewayIntentBits } from 'discord.js'

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
})

const TOKEN =
  'MTQzMTU3ODY0NzU1ODYxOTIwNw.GGppvl.DxzkfXS_U8rmHHvjAE9BdofL24sXxODPQH2V1U'
const GUILD_ID = '1397444632694231040'

// 2 role bạn muốn add
const ROLE_IDS = ['1487397330293624913', '1460232817555279943']

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`)

  const guild = await client.guilds.fetch(GUILD_ID)
  await guild.members.fetch()

  for (const member of guild.members.cache.values()) {
    try {
      // 🤖 Nếu là bot → remove role nếu có
      if (member.user.bot) {
        for (const roleId of ROLE_IDS) {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId)
            console.log(`Removed role ${roleId} from BOT ${member.user.tag}`)
          }
        }
        continue
      }

      // 👤 User thường → add role nếu chưa có
      for (const roleId of ROLE_IDS) {
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId)
          console.log(`Added role ${roleId} to ${member.user.tag}`)
        }
      }
    } catch (err) {
      console.error(`Error with ${member.user.tag}:`, err.message)
    }
  }
})

client.login(TOKEN)
