import { container } from '@sapphire/pieces'

import { VipType } from 'generated/prisma/client'

import { TIME } from '~/shared/constants/timeConstant'

/**
 * Repository for managing VIP statuses and custom roles.
 * Handles persistence for VIP membership types and member-owned custom roles.
 */
export class VipRepository {
  /**
   * Finds the VIP status for a specific guild member.
   * @param guildId The ID of the guild.
   * @param userId The ID of the member.
   * @returns The VIP status record if found, otherwise null.
   */
  public static async findStatus(guildId: string, userId: string) {
    return container.prisma.vipRole.findUnique({
      where: { guildId_userId: { guildId, userId } }
    })
  }

  /**
   * Creates or updates the VIP status for a guild member.
   * @param guildId The ID of the guild.
   * @param userId The ID of the member.
   * @param type The type of VIP membership.
   * @param [expireAt] The expiration date for LIMITED VIP types.
   * @returns The upserted VIP role record.
   */
  public static async upsertStatus(
    guildId: string,
    userId: string,
    type: VipType,
    expireAt?: Date | null
  ) {
    return container.prisma.vipRole.upsert({
      where: { guildId_userId: { guildId, userId } },
      create: { guildId, userId, type, expireAt: expireAt ?? null },
      update: { type, expireAt: expireAt ?? null }
    })
  }

  /**
   * Removes the VIP status for a specific guild member.
   * @param guildId The ID of the guild.
   * @param userId The ID of the member.
   * @returns The deleted record, or null if the record did not exist.
   */
  public static async removeStatus(guildId: string, userId: string) {
    return container.prisma.vipRole
      .delete({
        where: { guildId_userId: { guildId, userId } }
      })
      .catch(() => null)
  }

  /**
   * Finds the custom role record for a guild member.
   * @param guildId The ID of the guild.
   * @param userId The ID of the member.
   * @returns The custom role record if found, otherwise null.
   */
  public static async findCustomRole(guildId: string, userId: string) {
    return container.prisma.vipRole.findUnique({
      where: { guildId_userId: { guildId, userId } }
    })
  }

  /**
   * Creates or updates a custom role record for a member.
   * @param guildId The ID of the guild.
   * @param userId The ID of the member.
   * @param data The custom role data.
   * @param data.roleId The Discord Snowflake ID of the custom role.
   * @param [data.deletedAt] Optional date for scheduled deletion (Grace Period).
   * @returns The updated custom role record.
   */
  public static async upsertCustomRole(
    guildId: string,
    userId: string,
    data: {
      roleId: string
      deletedAt?: Date | null
    }
  ) {
    // Note: Since VipRole merges VipStatus and CustomRole,
    // the user must have already been granted VIP. So we only update.
    return container.prisma.vipRole.update({
      where: { guildId_userId: { guildId, userId } },
      data: {
        roleId: data.roleId,
        deletedAt: data.deletedAt ?? null
      }
    })
  }

  /**
   * Marks a custom role for deletion by setting a grace period expiration.
   * @param guildId The ID of the guild.
   * @param userId The ID of the member.
   * @returns The updated record with the deletion date set, or null if the record did not exist.
   */
  public static async markRoleForDeletion(guildId: string, userId: string) {
    const deletedAt = new Date(Date.now() + TIME.D7)

    return container.prisma.vipRole
      .update({
        where: { guildId_userId: { guildId, userId } },
        data: { deletedAt }
      })
      .catch(() => null)
  }

  /**
   * Finds all VIP statuses that have expired.
   * Only checks for 'LIMITED' type memberships.
   * @returns A list of expired VIP status records.
   */
  public static async findExpiredVips() {
    return container.prisma.vipRole.findMany({
      where: {
        type: 'LIMITED',
        expireAt: { lte: new Date() }
      }
    })
  }

  /**
   * Finds all custom roles whose grace period for deletion has expired.
   * @returns A list of custom role records ready for cleanup.
   */
  public static async findRolesToCleanup() {
    return container.prisma.vipRole.findMany({
      where: {
        deletedAt: { lte: new Date() }
      }
    })
  }

  /**
   * Finds a custom role by its Discord role ID.
   * @param roleId The Discord role ID.
   * @returns The custom role record if found, otherwise null.
   */
  public static async findCustomRoleByRoleId(roleId: string) {
    return container.prisma.vipRole.findUnique({
      where: { roleId }
    })
  }

  /**
   * Deletes a custom role record by its Discord role ID.
   * This effectively removes the custom role data.
   * @param roleId The Discord role ID.
   * @returns The updated record, or null if it did not exist.
   */
  public static async deleteCustomRoleByRoleId(roleId: string) {
    return container.prisma.vipRole
      .update({
        where: { roleId },
        data: { roleId: null, deletedAt: null }
      })
      .catch(() => null)
  }
}
