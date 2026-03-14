import { container } from '@sapphire/pieces'
import { ColorResolvable, Guild, GuildMember, Role } from 'discord.js'

import { VipType } from 'generated/prisma/client'

import { TIME } from '~/shared/constants/timeConstant'
import { GuildMemberRepository } from '~/shared/repositories/guildMemberRepository'
import { GuildRepository } from '~/shared/repositories/guildRepository'
import { SettingRepository } from '~/shared/repositories/settingRepository'

import { VipRepository } from '~/modules/vip/repositories/vipRepository'

/**
 * Cancel any pending vipExpire scheduled task for a specific user.
 */
async function cancelVipExpireTask(guildId: string, userId: string) {
  const jobs = await container.tasks.list({ types: ['delayed', 'waiting'] })
  for (const job of jobs) {
    const data = job.data as { guildId?: string; userId?: string }
    if (
      job.name === 'vipExpire' &&
      data?.guildId === guildId &&
      data?.userId === userId
    ) {
      await job.remove().catch(() => null)
    }
  }
}

export class VipService {
  /**
   * Grant VIP status to a member
   */
  public static async grantVip(
    member: GuildMember,
    type: VipType,
    durationDays?: number,
    selectedRoleId?: string
  ) {
    const { guild, id: userId } = member
    const guildId = guild.id

    // 1. Check existing VIP DB status
    const existingVip = await VipRepository.findStatus(guildId, userId)
    if (existingVip?.roleId) {
      throw new Error(
        'Người dùng này đã sở hữu một vai trò VIP! Hãy dùng lệnh `/vip remove` để thu hồi trước khi cấp mới.'
      )
    }

    // 2. Resolve or Create Role
    let role = selectedRoleId
      ? await guild.roles.fetch(selectedRoleId).catch(() => null)
      : null

    if (!role) {
      role = await guild.roles.create({
        name: `VIP - ${member.user.username}`,
        reason: `Custom VIP role for ${member.user.tag}`
      })

      const setting = await SettingRepository.find(guildId)
      if (setting?.vipAnchorRoleId) {
        const anchorRole = await guild.roles
          .fetch(setting.vipAnchorRoleId)
          .catch(() => null)

        if (anchorRole) {
          await role
            .setPosition(anchorRole.position + 1)
            .catch((err) =>
              container.logger.error(
                `[VipService] Failed to set role position for ${role!.id}:`,
                err
              )
            )
        }
      }
    }

    // 3. Optional timeframe
    let expireAt: Date | undefined
    if (type === 'LIMITED' && durationDays) {
      expireAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
    }

    // 4. Update Database
    await GuildRepository.upsert(guildId)
    await GuildMemberRepository.create({ guildId, userId })

    await container.prisma.vipRole.upsert({
      where: { guildId_userId: { guildId, userId } },
      create: { guildId, userId, type, expireAt, roleId: role.id },
      update: { type, expireAt, roleId: role.id, deletedAt: null }
    })

    // 5. Add role to member
    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role.id).catch(() => null)
    }

    // 6. Setup Task expiration
    await cancelVipExpireTask(guildId, userId)
    if (expireAt) {
      const delay = expireAt.getTime() - Date.now()
      if (delay > 0) {
        await container.tasks.create(
          { name: 'vipExpire', payload: { guildId, userId } },
          { delay, repeated: false }
        )
      }
    }

    return { type, expireAt, roleId: role.id }
  }

  /**
   * Tước vai trò VIP và đưa người dùng vào giai đoạn Grace Period (7 ngày chờ xóa Role)
   */
  public static async revokeVip(guild: Guild, userId: string) {
    const guildId = guild.id

    const vipRole = await VipRepository.findStatus(guildId, userId)
    if (!vipRole) return

    await cancelVipExpireTask(guildId, userId)

    await VipRepository.markRoleForDeletion(guildId, userId)

    await container.tasks.create(
      { name: 'vipCleanup', payload: { guildId, userId } },
      { delay: TIME.D7, repeated: false }
    )
  }

  /**
   * Xóa vĩnh viễn và lập tức mọi thông tin VIP của một người dùng
   */
  public static async deleteVipInstant(guild: Guild, userId: string) {
    await cancelVipExpireTask(guild.id, userId)
    await VipRepository.removeStatus(guild.id, userId)
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
    if (data.name) await role.setName(data.name)
    if (data.colors) await role.setColors(data.colors)
    if (data.icon) await role.setIcon(data.icon)
  }
}
