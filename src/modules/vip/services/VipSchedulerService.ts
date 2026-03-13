import { container } from '@sapphire/pieces'
import type { Client } from 'discord.js'

import { VipRepository } from '~/modules/vip/repositories/vipRepository'

import { VipService } from './VipService'

export class VipSchedulerService {
  /**
   * Run background checks for expired VIPs and cleanup roles (Startup/Manual)
   */
  public static async runChecks() {
    await this.checkExpirations()
    await this.cleanupRoles()
  }

  /**
   * Sync booster VIP for all members currently boosting across all guilds.
   * Grants BOOSTER VIP to anyone who is boosting but has no existing VIP status.
   * Should be called on bot ready to catch boosts that happened while bot was offline.
   */
  public static async syncBoosters(client: Client<true>) {
    for (const guild of client.guilds.cache.values()) {
      const members = await guild.members.fetch().catch(() => null)
      if (!members) continue

      for (const member of members.values()) {
        if (!member.premiumSince) continue

        const vipStatus = await VipRepository.findStatus(guild.id, member.id)
        if (!vipStatus) {
          // Chưa có VIP status → grant mới
          await VipService.grantVip(member, 'BOOSTER').catch((err) => {
            container.logger.error(
              `[VipSchedulerService] Failed to sync BOOSTER VIP for ${member.user.tag} in ${guild.name}:`,
              err
            )
          })
          container.logger.info(
            `[VipSchedulerService] Synced BOOSTER VIP for ${member.user.tag} (${member.id}) in ${guild.name}`
          )
        } else {
          // Đã có VIP status → kiểm tra custom role trên Discord còn tồn tại không
          const customRole = await VipRepository.findCustomRole(
            guild.id,
            member.id
          )
          if (customRole) {
            const roleExists = await guild.roles
              .fetch(customRole.roleId)
              .catch(() => null)

            if (!roleExists) {
              // Role bị xóa khỏi Discord (khi bot offline) → tạo lại
              await VipService.grantVip(member, vipStatus.type).catch((err) => {
                container.logger.error(
                  `[VipSchedulerService] Failed to recreate VIP role for ${member.user.tag} in ${guild.name}:`,
                  err
                )
              })
              container.logger.info(
                `[VipSchedulerService] Recreated missing VIP role for ${member.user.tag} (${member.id}) in ${guild.name}`
              )
            }
          }
        }
      }
    }
  }

  /**
   * Handle single VIP expiration (Task-based)
   */
  public static async handleExpiration(guildId: string, userId: string) {
    const guild = await container.client.guilds.fetch(guildId).catch(() => null)
    if (!guild) return

    // Verify if it's still expired (in case of manual renewal)
    const vip = await VipRepository.findStatus(guildId, userId)
    if (
      vip &&
      vip.type === 'LIMITED' &&
      vip.expireAt &&
      vip.expireAt <= new Date()
    ) {
      await VipService.revokeVip(guild, userId)
      container.logger.info(
        `[VipSchedulerService] Revoked expired VIP for user ${userId} in guild ${guildId} via task`
      )
    }
  }

  /**
   * Handle single role cleanup (Task-based)
   */
  public static async handleCleanup(guildId: string, userId: string) {
    const customRole = await VipRepository.findCustomRole(guildId, userId)
    if (
      !customRole ||
      !customRole.deletedAt ||
      customRole.deletedAt > new Date()
    )
      return

    const guild = await container.client.guilds.fetch(guildId).catch(() => null)
    if (guild) {
      const role = await guild.roles.fetch(customRole.roleId).catch(() => null)
      if (role) {
        await role
          .delete(`VIP Grace Period (7 days) expired. Permanent deletion.`)
          .catch(() => null)
      }
    }

    await VipRepository.deleteCustomRole(guildId, userId)
    container.logger.info(
      `[VipSchedulerService] Permanently deleted custom role ${customRole.roleId} for user ${userId} via task`
    )
  }

  /**
   * Check for expired LIMITED VIPs (Recovery)
   */
  private static async checkExpirations() {
    const expiredVips = await VipRepository.findExpiredVips()

    for (const vip of expiredVips) {
      await this.handleExpiration(vip.guildId, vip.userId)
    }
  }

  /**
   * Cleanup roles that passed the 7-day grace period (Recovery)
   */
  private static async cleanupRoles() {
    const rolesToCleanup = await VipRepository.findRolesToCleanup()

    for (const roleData of rolesToCleanup) {
      await this.handleCleanup(roleData.guildId, roleData.userId)
    }
  }
}
