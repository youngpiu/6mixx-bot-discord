import { ApplyOptions, RegisterChatInputCommand } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { ChatInputCommandInteraction } from 'discord.js'

import { TIME } from '~/shared/constants/timeConstant'

import { VoiceInfoCommand } from '~/modules/voice/commands/_voiceInfoCommand'
import { VoiceInviteCommand } from '~/modules/voice/commands/_voiceInviteCommand'
import { VoiceKickCommand } from '~/modules/voice/commands/_voiceKickCommand'
import { VoiceLimitCommand } from '~/modules/voice/commands/_voiceLimitCommand'
import { VoiceLockCommand } from '~/modules/voice/commands/_voiceLockCommand'
import { VoicePermissionClaimCommand } from '~/modules/voice/commands/_voicePermissionClaimCommand'
import { VoicePermissionTransferCommand } from '~/modules/voice/commands/_voicePermissionTransferCommand'
import { VoiceRenameCommand } from '~/modules/voice/commands/_voiceRenameCommand'
import { VoiceTrustRoleCommand } from '~/modules/voice/commands/_voiceTrustRoleCommand'
import { VoiceTrustUserCommand } from '~/modules/voice/commands/_voiceTrustUserCommand'
import { VoiceUnlockCommand } from '~/modules/voice/commands/_voiceUnlockCommand'

@RegisterChatInputCommand((builder) =>
  builder
    .setName('voice')
    .setDescription('Quản lý phòng thoại tạm thời.')
    .addSubcommand((sub) =>
      sub
        .setName('rename')
        .setDescription('Đổi tên phòng thoại tạm thời.')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Tên mới của phòng thoại.')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('limit')
        .setDescription('Đặt giới hạn người trong phòng thoại.')
        .addIntegerOption((option) =>
          option
            .setName('limit')
            .setDescription('Số người tối đa (0 = không giới hạn).')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(99)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('lock').setDescription('Khóa phòng thoại tạm thời.')
    )
    .addSubcommand((sub) =>
      sub.setName('unlock').setDescription('Mở khóa phòng thoại tạm thời.')
    )
    .addSubcommandGroup((group) =>
      group
        .setName('permission')
        .setDescription('Quản lý quyền chủ phòng thoại.')
        .addSubcommand((sub) =>
          sub
            .setName('transfer')
            .setDescription('Chuyển quyền chủ phòng thoại cho người khác.')
            .addUserOption((option) =>
              option
                .setName('user')
                .setDescription('Người nhận quyền chủ phòng thoại.')
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('claim')
            .setDescription('Lấy quyền chủ phòng thoại tạm thời.')
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('trust')
        .setDescription(
          'Quản lý người và vai trò được phép vào phòng thoại khi khóa.'
        )
        .addSubcommand((sub) =>
          sub
            .setName('user')
            .setDescription(
              'Sửa danh sách người được phép vào phòng thoại khi khoá.'
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('role')
            .setDescription(
              'Sửa danh sách vai trò được phép vào kênh khi khoá.'
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('kick')
        .setDescription('Đuổi một người ra khỏi phòng thoại tạm thời.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người muốn đuổi.')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Xem thông tin phòng thoại tạm thời của bạn.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('invite')
        .setDescription('Mời một người vào phòng thoại tạm thời.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Người muốn mời.')
            .setRequired(true)
        )
    )
)
/**
 * Main command class for temporary voice channel management.
 * Handles subcommands like rename, limit, lock, trust, etc.
 */
@ApplyOptions<Subcommand.Options>({
  name: 'voice',
  description: 'Quản lý phòng voice tạm.',
  preconditions: ['GuildOnly', 'TempVoiceChannelOnly'],
  subcommands: [
    {
      name: 'rename',
      chatInputRun: 'chatInputRename',
      preconditions: ['TempVoiceOwnerOnly'],
      cooldownDelay: TIME.M2,
      cooldownLimit: 1
    },
    {
      name: 'limit',
      chatInputRun: 'chatInputLimit',
      preconditions: ['TempVoiceOwnerOnly'],
      cooldownDelay: TIME.M1,
      cooldownLimit: 1
    },
    {
      name: 'lock',
      chatInputRun: 'chatInputLock',
      preconditions: ['TempVoiceOwnerOnly'],
      cooldownDelay: TIME.M1,
      cooldownLimit: 1
    },
    {
      name: 'unlock',
      chatInputRun: 'chatInputUnlock',
      preconditions: ['TempVoiceOwnerOnly'],
      cooldownDelay: TIME.M1,
      cooldownLimit: 1
    },
    {
      type: 'group',
      name: 'permission',
      entries: [
        {
          name: 'transfer',
          chatInputRun: 'chatInputPermissionTransfer',
          preconditions: ['TempVoiceOwnerOnly'],
          cooldownDelay: TIME.M2,
          cooldownLimit: 1
        },
        {
          name: 'claim',
          chatInputRun: 'chatInputPermissionClaim',
          preconditions: ['TempVoiceChannelOnly'],
          cooldownDelay: TIME.M2,
          cooldownLimit: 1
        }
      ]
    },
    {
      name: 'kick',
      chatInputRun: 'chatInputKick',
      preconditions: ['TempVoiceOwnerOnly'],
      cooldownDelay: TIME.S30,
      cooldownLimit: 1
    },
    {
      name: 'info',
      chatInputRun: 'chatInputInfo',
      preconditions: ['TempVoiceChannelOnly'],
      cooldownDelay: TIME.S30,
      cooldownLimit: 1
    },
    {
      name: 'invite',
      chatInputRun: 'chatInputInvite',
      preconditions: ['TempVoiceChannelOnly'],
      cooldownDelay: TIME.S15,
      cooldownLimit: 1
    },
    {
      type: 'group',
      name: 'trust',
      entries: [
        {
          name: 'user',
          chatInputRun: 'chatInputTrustUser',
          preconditions: ['TempVoiceOwnerOnly'],
          cooldownDelay: TIME.M1,
          cooldownLimit: 1
        },
        {
          name: 'role',
          chatInputRun: 'chatInputTrustRole',
          preconditions: ['TempVoiceOwnerOnly'],
          cooldownDelay: TIME.M1,
          cooldownLimit: 1
        }
      ]
    }
  ]
})
export class VoiceSubcommand extends Subcommand {
  /**
   * Handles the 'rename' subcommand.
   * @param interaction The chat input command interaction.
   */
  public async chatInputRename(interaction: ChatInputCommandInteraction) {
    return VoiceRenameCommand.run(interaction)
  }

  /**
   * Handles the 'limit' subcommand.
   * @param interaction The chat input command interaction.
   */
  public async chatInputLimit(interaction: ChatInputCommandInteraction) {
    return VoiceLimitCommand.run(interaction)
  }

  /**
   * Handles the 'lock' subcommand.
   * @param interaction The chat input command interaction.
   */
  public async chatInputLock(interaction: ChatInputCommandInteraction) {
    return VoiceLockCommand.run(interaction)
  }

  /**
   * Handles the 'unlock' subcommand.
   * @param interaction The chat input command interaction.
   */
  public async chatInputUnlock(interaction: ChatInputCommandInteraction) {
    return VoiceUnlockCommand.run(interaction)
  }

  /**
   * Handles the 'transfer' subcommand.
   * @param interaction The chat input command interaction.
   */
  public async chatInputPermissionTransfer(
    interaction: ChatInputCommandInteraction
  ) {
    return VoicePermissionTransferCommand.run(interaction)
  }

  /**
   * Handles the 'claim' subcommand.
   * @param interaction The chat input command interaction.
   */
  public async chatInputPermissionClaim(
    interaction: ChatInputCommandInteraction
  ) {
    return VoicePermissionClaimCommand.run(interaction)
  }

  /**
   * Handles the 'user' trust subcommand.
   * @param interaction The chat input command interaction.
   */
  public async chatInputTrustUser(interaction: ChatInputCommandInteraction) {
    return VoiceTrustUserCommand.run(interaction)
  }

  /**
   * Handles the 'role' trust subcommand.
   * @param interaction The chat input command interaction.
   */
  public async chatInputTrustRole(interaction: ChatInputCommandInteraction) {
    return VoiceTrustRoleCommand.run(interaction)
  }

  /**
   * Handles the 'info' subcommand.
   * @param interaction The chat input command interaction.
   */
  public async chatInputInfo(interaction: ChatInputCommandInteraction) {
    return VoiceInfoCommand.run(interaction)
  }

  /**
   * Handles the 'kick' subcommand.
   * @param interaction The chat input command interaction.
   */
  public async chatInputKick(interaction: ChatInputCommandInteraction) {
    return VoiceKickCommand.run(interaction)
  }

  /**
   * Handles the 'invite' subcommand.
   * @param interaction The chat input command interaction.
   */
  public async chatInputInvite(interaction: ChatInputCommandInteraction) {
    return VoiceInviteCommand.run(interaction)
  }
}
