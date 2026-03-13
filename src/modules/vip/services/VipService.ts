import { container } from '@sapphire/pieces'
import { ColorResolvable, Guild, GuildMember, Role } from 'discord.js'

import { VipType } from 'generated/prisma/enums'

import { TIME } from '~/shared/constants/timeConstant'
import { SettingRepository } from '~/shared/repositories/settingRepository'

import { VipRepository } from '~/modules/vip/repositories/vipRepository'

export class VipService {
  /**
   * Grant VIP status to a member
   */
  public static async grantVip(
    member: GuildMember,
    type: VipType,
    durationDays?: number
  ) {
    const guildId = member.guild.id
    const userId = member.id

    // 1. Calculate expiration
    let expireAt: Date | undefined
    if (type === 'LIMITED' && durationDays) {
      expireAt = new Date()
      expireAt.setDate(expireAt.getDate() + durationDays)
    }

    // 2. Update VIP Status in DB
    await VipRepository.upsertStatus(guildId, userId, type, expireAt)

    // Schedule expiration task if it's LIMITED
    if (type === 'LIMITED' && expireAt) {
      const delay = expireAt.getTime() - Date.now()
      if (delay > 0) {
        await container.tasks.create(
          { name: 'vipExpire', payload: { guildId, userId } },
          { delay, repeated: false }
        )
      }
    }

    // 3. Handle Custom Role
    const customRole = await VipRepository.findCustomRole(guildId, userId)
    let role: Role | null = null

    if (customRole) {
      // Role exists, check if it was marked for deletion
      role = await member.guild.roles.fetch(customRole.roleId).catch(() => null)

      if (role) {
        // If role was marked for deletion, restore it
        if (customRole.deletedAt) {
          await VipRepository.upsertCustomRole(guildId, userId, {
            roleId: role.id,
            deletedAt: null
          })
        }
      }
    }

    if (!role) {
      // Role doesn't exist or was deleted from Discord, create new one
      role = await member.guild.roles.create({
        name: `VIP - ${member.user.username}`,
        reason: `Custom VIP role for ${member.user.tag}`
      })

      // Try to position it below anchor role if configured
      const setting = await SettingRepository.find(guildId)

      if (setting?.vipAnchorRoleId) {
        const anchorRole = await member.guild.roles
          .fetch(setting.vipAnchorRoleId)
          .catch(() => null)
        if (anchorRole) {
          // Add error handling for permissions
          try {
            await role.setPosition(anchorRole.position + 1)
          } catch (error) {
            container.logger.error(
              `[VipService] Failed to set role position for ${role.id}:`,
              error
            )
          }
        }
      }

      await VipRepository.upsertCustomRole(guildId, userId, {
        roleId: role.id,
        deletedAt: null
      })
    }

    // 4. Assign role to member
    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role.id)
    }

    return { type, expireAt, roleId: role.id }
  }

  /**
   * Revoke VIP status (start grace period)
   */
  public static async revokeVip(guild: Guild, userId: string) {
    const guildId = guild.id

    // 1. Remove VIP Status from DB
    await VipRepository.removeStatus(guildId, userId)

    // 2. Remove role from member if they are still in server
    const member = await guild.members.fetch(userId).catch(() => null)
    const customRole = await VipRepository.findCustomRole(guildId, userId)

    if (customRole) {
      if (member && member.roles.cache.has(customRole.roleId)) {
        await member.roles.remove(customRole.roleId)
      }

      // 3. Mark role for deletion (Grace Period)
      await VipRepository.markRoleForDeletion(guildId, userId)

      // Schedule cleanup task for 7 days later
      await container.tasks.create(
        { name: 'vipCleanup', payload: { guildId, userId } },
        { delay: TIME.D7, repeated: false }
      )
    }
  }

  /**
   * Update custom role styling
   */
  public static async updateRoleStyle(
    role: Role,
    data: {
      name?: string
      colors?: {
        primaryColor: ColorResolvable
        secondaryColor?: ColorResolvable
      }
      icon?: string
    }
  ) {
    if (data.name) {
      await role.setName(data.name)
    }

    if (data.colors) {
      // Use standard setColors method from the library
      await role.setColors(data.colors)
    }

    if (data.icon) {
      await role.setIcon(data.icon)
    }

    // Update DB
    const guildId = role.guild.id
    // We need to find which user this role belongs to
    const customRoleEntry = await VipRepository.findCustomRoleByRoleId(role.id)

    if (customRoleEntry) {
      await VipRepository.upsertCustomRole(guildId, customRoleEntry.userId, {
        roleId: role.id
      })
    }
  }
}
