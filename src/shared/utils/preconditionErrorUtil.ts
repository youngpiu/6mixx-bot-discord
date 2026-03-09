import { DecoratorIdentifiers } from '@sapphire/decorators'
import { Identifiers, type UserError } from '@sapphire/framework'
import { ChannelType, type PermissionsString } from 'discord.js'

import { CHANNEL_TYPE_NAMES } from '~/shared/constants/channelTypeConstant'
import { PERMISSION_NAMES } from '~/shared/constants/permissionConstant'
import {
  BannedError,
  ErrorResponseCore,
  NormalError,
  PermissionError,
  RateLimitError
} from '~/core/errorResponse'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PermissionContext {
  missing: string[]
}

interface RunInContext {
  types: ChannelType[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatMissingPermissions = (missing: string[]): string =>
  missing.map((p) => PERMISSION_NAMES[p as PermissionsString] ?? p).join(', ')

const formatAllowedChannels = (types: ChannelType[]): string =>
  types.map((t) => CHANNEL_TYPE_NAMES[t] ?? `#${t}`).join(', ')

// ─── Identifier Sets (chỉ dùng Set khi có nhiều identifier trong cùng nhóm) ──

const USER_PERMISSION_IDENTIFIERS = new Set<string>([
  Identifiers.PreconditionUserPermissions,
  Identifiers.PreconditionUserPermissionsNoPermissions,
  DecoratorIdentifiers.RequiresUserPermissionsGuildOnly,
  DecoratorIdentifiers.RequiresUserPermissionsMissingPermissions
])

const CLIENT_PERMISSION_IDENTIFIERS = new Set<string>([
  Identifiers.PreconditionClientPermissions,
  Identifiers.PreconditionClientPermissionsNoClient,
  Identifiers.PreconditionClientPermissionsNoPermissions,
  DecoratorIdentifiers.RequiresClientPermissionsGuildOnly,
  DecoratorIdentifiers.RequiresClientPermissionsMissingPermissions
])

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapDeniedError(error: UserError): ErrorResponseCore {
  const id = error.identifier
  const ctx = error.context as Record<string, unknown> | null

  const isCustomMessage = ctx?.isCustomMessage

  // ── Cooldown ──────────────────────────────────────────────────────────────
  if (id === Identifiers.PreconditionCooldown) {
    if (isCustomMessage) return new RateLimitError(error.message)
    return new RateLimitError(`Bạn đang thao tác quá nhanh, vui lòng sống chậm lại.`)
  }

  // ── User Permissions ──────────────────────────────────────────────────────
  if (USER_PERMISSION_IDENTIFIERS.has(id)) {
    const missing = (ctx as unknown as PermissionContext)?.missing
    if (isCustomMessage) return new PermissionError(error.message)
    if (missing && missing.length > 0) {
      return new PermissionError(
        `Bạn không có đủ quyền để thực hiện hành động này, do thiếu các quyền sau: \`${formatMissingPermissions(missing)}\`.`
      )
    }
    return new PermissionError('Bạn không có đủ quyền để thực hiện hành động này.')
  }

  // ── Client Permissions ────────────────────────────────────────────────────
  if (CLIENT_PERMISSION_IDENTIFIERS.has(id)) {
    const missing = (ctx as unknown as PermissionContext)?.missing
    if (isCustomMessage) return new PermissionError(error.message)
    if (missing && missing.length > 0) {
      return new PermissionError(
        `Mình không có đủ quyền để thực hiện hành động này, do thiếu các quyền sau: \`${formatMissingPermissions(missing)}\`.`
      )
    }
    return new PermissionError('Mình không có đủ quyền để thực hiện hành động này.')
  }

  // ── Command Disabled ──────────────────────────────────────────────────────
  if (id === Identifiers.CommandDisabled) {
    if (isCustomMessage) return new BannedError(error.message)
    return new BannedError('Lệnh này hiện đang bị vô hiệu hoá, không thể sử dụng được.')
  }

  // ── NSFW ──────────────────────────────────────────────────────────────────
  if (id === Identifiers.PreconditionNSFW) {
    if (isCustomMessage) return new BannedError(error.message)
    return new BannedError('Lệnh này chỉ khả dụng trong kênh NSFW (18+).')
  }

  // ── RunIn / Channel Type ──────────────────────────────────────────────────
  if (id === Identifiers.PreconditionRunIn) {
    const types = (ctx as unknown as RunInContext)?.types
    if (isCustomMessage) return new BannedError(error.message)
    if (types && types.length > 0) {
      return new BannedError(
        `Lệnh này chỉ hoạt động trong các kênh: \`${formatAllowedChannels(types)}\`.`
      )
    }
    return new BannedError('Lệnh này không được phép sử dụng trong loại kênh hiện tại.')
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return new NormalError(error.message)
}
