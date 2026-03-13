import { container } from '@sapphire/pieces'
import type { Client, Guild } from 'discord.js'

import { GuildMemberRepository } from '~/shared/repositories/guildMemberRepository'

/**
 * Service for syncing guild members to the database via REST API.
 * Uses GET /guilds/{id}/members (pagination) instead of Gateway opcode 8
 * to avoid the 1 request/guild/30s rate limit on REQUEST_GUILD_MEMBERS.
 */
export class GuildMemberSyncService {
  /**
   * Syncs all non-bot members of a single guild to the database.
   * Paginates through the full member list using REST API (limit 1000 per page).
   *
   * @param guild - The guild to sync.
   * @returns The total number of newly inserted member records.
   */
  public static async syncGuild(guild: Guild): Promise<number> {
    let after: string | undefined = undefined
    let totalSynced = 0

    while (true) {
      const batch = await guild.members.list({ limit: 1000, after })

      if (batch.size === 0) break

      const data = batch
        .filter((m) => !m.user.bot)
        .map((m) => ({ guildId: guild.id, userId: m.id }))

      if (data.length > 0) {
        const result = await GuildMemberRepository.createMany(data)
        totalSynced += result.count
      }

      // Advance cursor to the last member ID for next page
      after = batch.lastKey()

      // All members fetched when batch is smaller than the limit
      if (batch.size < 1000) break
    }

    return totalSynced
  }

  /**
   * Syncs all non-bot members across all guilds the bot is in.
   * Used at startup to catch any members who joined while the bot was offline.
   *
   * @param client - The connected Discord client.
   */
  public static async syncAllGuilds(client: Client<true>) {
    for (const guild of client.guilds.cache.values()) {
      const totalSynced = await this.syncGuild(guild)
      container.logger.info(
        `[Ready] Synced ${totalSynced} members for guild ${guild.name}`
      )
    }
  }
}
