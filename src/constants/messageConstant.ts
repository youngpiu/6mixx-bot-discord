import { env } from '~/config/env'

import { GuildRepository } from '~/repositories/guildRepository'

export const RANDOM_LOADING_MESSAGES: string[] = [
  'Đang làm nè, từ từ chút...',
  'Chờ xíu, mình đang xử lý...',
  'Đang bận tay một chút...',
  'Từ từ nha, đang làm tới rồi...',
  'Đang xoay xở đây...',
  'Đang làm dở tay, chờ mình tí...',
  'Chưa xong liền được đâu, đợi chút...',
  'Đang cố xử lý cho xong...',
  'Làm chậm nhưng chắc...',
  'Đợi tí nha, sắp xong rồi...'
]

async function getSupportMessage(
  guild: { id: string; ownerId: string } | null,
  messageTemplate: {
    withTicketChannel: (subject: string, channelId: string) => string
    withBotOwner: (subject: string, supporterId: string) => string
    withGuildOwner: (subject: string, ownerId: string) => string
    withAdmin: (subject: string) => string
  },
  subject: string
) {
  const ticketChannelId = guild
    ? (await GuildRepository.getGuild(guild.id))?.ticketTutorialThreadId
    : null

  if (ticketChannelId) {
    return messageTemplate.withTicketChannel(subject, ticketChannelId)
  }

  if (env.BOT_OWNER_DISCORD_ID) {
    return messageTemplate.withBotOwner(subject, env.BOT_OWNER_DISCORD_ID)
  }

  if (guild?.ownerId) {
    return messageTemplate.withGuildOwner(subject, guild.ownerId)
  }

  return messageTemplate.withAdmin(subject)
}

async function getErrorDescription(
  guild: { id: string; ownerId: string } | null,
  errorType: string
) {
  return getSupportMessage(
    guild,
    {
      withTicketChannel: (type, channelId) =>
        `${type} đã gặp sự cố, vui lòng báo lỗi tại kênh <#${channelId}> để được hỗ trợ.`,
      withBotOwner: (type, supporterId) =>
        `${type} đã gặp sự cố, vui lòng liên hệ <@${supporterId}> để được hỗ trợ.`,
      withGuildOwner: (type, ownerId) =>
        `${type} đã gặp sự cố, vui lòng liên hệ <@${ownerId}> để được hỗ trợ.`,
      withAdmin: (type) => `${type} đã gặp sự cố, vui lòng liên hệ **Ban quản lý** để được hỗ trợ.`
    },
    errorType
  )
}

async function getNotConfiguredDescription(
  guild: { id: string; ownerId: string } | null,
  featureName: string
) {
  return getSupportMessage(
    guild,
    {
      withTicketChannel: (feature, channelId) =>
        `${feature} chưa được thiết lập, vui lòng báo lỗi tại kênh <#${channelId}> để được hỗ trợ.`,
      withBotOwner: (feature, supporterId) =>
        `${feature} chưa được thiết lập, vui lòng liên hệ <@${supporterId}> để được hỗ trợ.`,
      withGuildOwner: (feature, ownerId) =>
        `${feature} chưa được thiết lập, vui lòng liên hệ <@${ownerId}> để được hỗ trợ.`,
      withAdmin: (feature) =>
        `${feature} chưa được thiết lập, vui lòng liên hệ **Ban quản lý** để được hỗ trợ.`
    },
    featureName
  )
}

export const ERROR_MESSAGE = {
  BAD_REQUEST: {
    TITLE: 'Yêu cầu không hợp lệ',
    DESCRIPTION: 'Không thể thực hiện yêu cầu của bạn, vui lòng thử lại sau.',
    GUILD_ONLY_DESCRIPTION:
      'Lệnh này không thể sử dụng được ở DM, vui lòng sử dụng ở bên trong máy chủ.'
  },

  NOT_FOUND: {
    TITLE: 'Tài nguyên không tồn tại',
    DESCRIPTION: 'Không thể tìm thấy tài nguyên bạn yêu cầu, vui lòng kiểm tra lại.'
  },

  FORBIDDEN: {
    TITLE: 'Quyền hạn không đủ',
    DESCRIPTION: 'Không thể thực hiện yêu cầu của bạn, vui lòng kiểm tra lại quyền hạn của bạn.',
    OWNER_ONLY_DESCRIPTION:
      'Không thể thực hiện yêu cầu của bạn, chỉ **Chủ sở hữu máy chủ** mới có thể sử dụng lệnh này.',
    ADMIN_ONLY_DESCRIPTION:
      'Không thể thực hiện yêu cầu của bạn, chỉ người có quyền **Quản trị viên** mới có thể sử dụng lệnh này.',
    MANAGE_MESSAGES_ONLY_DESCRIPTION:
      'Không thể thực hiện yêu cầu của bạn, chỉ người có quyền **Quản lý tin nhắn** mới có thể sử dụng lệnh này.',
    MANAGE_CHANNELS_ONLY_DESCRIPTION:
      'Không thể thực hiện yêu cầu của bạn, chỉ người có quyền **Quản lý kênh** mới có thể sử dụng lệnh này.',
    MANAGE_ROLES_ONLY_DESCRIPTION:
      'Không thể thực hiện yêu cầu của bạn, chỉ người có quyền **Quản lý vai trò** mới có thể sử dụng lệnh này.'
  },

  DATABASE_ERROR: {
    TITLE: 'Lỗi cơ sở dữ liệu',
    DESCRIPTION: (guild: { id: string; ownerId: string } | null) =>
      getErrorDescription(guild, 'Cơ sở dữ liệu')
  },

  INTERNAL_SERVER_ERROR: {
    TITLE: 'Lỗi hệ thống',
    DESCRIPTION: (guild: { id: string; ownerId: string } | null) =>
      getErrorDescription(guild, 'Hệ thống')
  },

  NOT_CONFIGURED: {
    TITLE: 'Tính năng chưa được thiết lập',
    DESCRIPTION: (guild: { id: string; ownerId: string } | null, featureName: string) =>
      getNotConfiguredDescription(guild, featureName)
  }
} as const
