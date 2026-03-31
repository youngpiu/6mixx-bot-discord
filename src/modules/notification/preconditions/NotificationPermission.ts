import { Identifiers, Precondition } from '@sapphire/framework'
import type { ChatInputCommandInteraction, GuildMember } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'

export class NotificationPermissionPrecondition extends Precondition {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      return this.error({
        message: 'Lệnh này chỉ có thể sử dụng trong máy chủ.',
        identifier: Identifiers.PreconditionUserPermissions,
        context: { isCustomMessage: true }
      })
    }

    const subcommand = interaction.options.getSubcommand(false)
    if (!subcommand) return this.ok()

    const guildConfig = await SettingRepository.find(interaction.guildId)
    const isOwner = interaction.guild?.ownerId === interaction.user.id
    const member = interaction.member as GuildMember

    const allowedRoleIds =
      subcommand === 'youtube' ||
      subcommand === 'twitter' ||
      subcommand === 'instagram'
        ? guildConfig?.snsAllowedRoleIds || []
        : []

    if (allowedRoleIds.length > 0) {
      if (isOwner || member.roles.cache.hasAny(...allowedRoleIds)) {
        return this.ok()
      }

      return this.error({
        message: 'Bạn không có vai trò được phép sử dụng lệnh này.',
        identifier: Identifiers.PreconditionUserPermissions,
        context: { isCustomMessage: true }
      })
    }

    if (isOwner) {
      return this.ok()
    }

    return this.error({
      message: 'Bạn không có quyền sử dụng lệnh này (Yêu cầu Owner).',
      identifier: Identifiers.PreconditionUserPermissions,
      context: { isCustomMessage: true }
    })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    NotificationPermission: never
  }
}
