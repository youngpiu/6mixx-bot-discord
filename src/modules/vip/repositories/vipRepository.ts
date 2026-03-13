import { container } from '@sapphire/pieces'

import { VipType } from 'generated/prisma/client'

import { TIME } from '~/shared/constants/timeConstant'

export class VipRepository {
  /**
   * Find VIP status for a member
   */
  public static async findStatus(guildId: string, userId: string) {
    return container.prisma.vipStatus.findUnique({
      where: { guildId_userId: { guildId, userId } }
    })
  }

  /**
   * Upsert VIP status
   */
  public static async upsertStatus(
    guildId: string,
    userId: string,
    type: VipType,
    expireAt?: Date
  ) {
    return container.prisma.vipStatus.upsert({
      where: { guildId_userId: { guildId, userId } },
      create: { guildId, userId, type, expireAt },
      update: { type, expireAt }
    })
  }

  /**
   * Remove VIP status
   */
  public static async removeStatus(guildId: string, userId: string) {
    return container.prisma.vipStatus
      .delete({
        where: { guildId_userId: { guildId, userId } }
      })
      .catch(() => null)
  }

  /**
   * Find custom role for a member
   */
  public static async findCustomRole(guildId: string, userId: string) {
    return container.prisma.customRole.findUnique({
      where: { guildId_userId: { guildId, userId } }
    })
  }

  /**
   * Upsert custom role info
   */
  public static async upsertCustomRole(
    guildId: string,
    userId: string,
    data: {
      roleId: string
      deletedAt?: Date | null
    }
  ) {
    return container.prisma.customRole.upsert({
      where: { guildId_userId: { guildId, userId } },
      create: { guildId, userId, ...data },
      update: data
    })
  }

  /**
   * Mark custom role for deletion (Grace Period)
   */
  public static async markRoleForDeletion(guildId: string, userId: string) {
    const deletedAt = new Date(Date.now() + TIME.D7)

    return container.prisma.customRole
      .update({
        where: { guildId_userId: { guildId, userId } },
        data: { deletedAt }
      })
      .catch(() => null)
  }

  /**
   * Find all expired VIPs
   */
  public static async findExpiredVips() {
    return container.prisma.vipStatus.findMany({
      where: {
        type: 'LIMITED',
        expireAt: { lte: new Date() }
      }
    })
  }

  /**
   * Find all roles marked for deletion that have passed the grace period
   */
  public static async findRolesToCleanup() {
    return container.prisma.customRole.findMany({
      where: {
        deletedAt: { lte: new Date() }
      }
    })
  }

  /**
   * Permanently delete a custom role from DB
   */
  public static async deleteCustomRole(guildId: string, userId: string) {
    return container.prisma.customRole
      .delete({
        where: { guildId_userId: { guildId, userId } }
      })
      .catch(() => null)
  }

  /**
   * Finds a custom role by its Discord role ID.
   *
   * @param roleId - The Discord Snowflake ID of the role.
   * @returns A promise resolving to the custom role record or null.
   */
  public static async findCustomRoleByRoleId(roleId: string) {
    return container.prisma.customRole.findUnique({
      where: { roleId }
    })
  }
}
