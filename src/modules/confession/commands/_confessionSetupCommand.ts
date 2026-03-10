// Command to setup confession system for a guild
import { container } from '@sapphire/pieces'
import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  ForumChannel,
  TextChannel
} from 'discord.js'

import { NormalError } from '~/core/errorResponse'

import { CUSTOM_ID } from '~/shared/constants/idConstant'
import { GuildRepository as SharedGuildRepository } from '~/shared/repositories/guildRepository'
import { InteractionUtil } from '~/shared/utils/messageUtil'
import { lines } from '~/shared/utils/textUtil'

import { GuildRepository } from '~/modules/confession/repositories/guildRepository'

export class ConfessionSetupCommand {
  public static async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ['Ephemeral'] })

    if (!interaction.guild) {
      throw new NormalError('Lệnh này chỉ có thể sử dụng trong máy chủ.')
    }

    const notificationChannel = interaction.options.getChannel(
      'notification-channel',
      true
    ) as TextChannel
    const forumChannel = interaction.options.getChannel(
      'forum-channel',
      true
    ) as ForumChannel

    if (!notificationChannel || !forumChannel) {
      throw new NormalError(
        'Vui lòng chọn đầy đủ kênh thông báo và kênh forum.'
      )
    }

    // Ensure guild exists
    await SharedGuildRepository.upsert(interaction.guild.id)

    // Check if config exists and delete old thread
    const existingConfig = await GuildRepository.getConfig(interaction.guild.id)

    if (existingConfig?.confessionTutorialThreadId) {
      try {
        const oldThread = await container.client.channels.fetch(
          existingConfig.confessionTutorialThreadId
        )
        if (oldThread?.isThread()) {
          await oldThread.delete()
        }
      } catch {
        // ignore
      }
    }

    // Create tutorial thread in forum channel
    const tutorialThread = await forumChannel.threads.create({
      name: 'Hướng dẫn gửi Confession',
      message: {
        components: [this.createTutorialContainer()],
        flags: ['IsComponentsV2']
      }
    })

    // Save config
    await GuildRepository.update({
      guildId: interaction.guild.id,
      data: {
        confessionForumChannelId: forumChannel.id,
        confessionTutorialThreadId: tutorialThread.id
      }
    })

    await InteractionUtil.replySuccess(
      interaction,
      lines(
        `Đã thiết lập hệ thống Confession.`,
        `- **Kênh thông báo duyệt:** <#${notificationChannel.id}>`,
        `- **Kênh Confession:** <#${forumChannel.id}>`,
        `- **Thread hướng dẫn:** <#${tutorialThread.id}>`
      )
    )
  }

  private static createTutorialContainer() {
    return (
      new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent(
            lines(
              '## VNMIXX Confession',
              '-# Nơi bạn có thể chia sẻ câu chuyện của chính mình hoặc mọi điều liên quan đến **NMIXX**.'
            )
          )
        )

        .addSeparatorComponents((sep) => sep.setDivider(true))

        .addTextDisplayComponents((text) =>
          text.setContent(
            lines(
              '### Quy định',
              '- Confession phải tuân thủ luật của máy chủ **VNMIXX**.',
              '- Hạn chế các nội dung tiêu cực, không rõ ràng liên quan đến tình cảm, hôn nhân.',
              '- Không chấp nhận confession trống nội dung, mang tính spam hoặc không có ý nghĩa chia sẻ.'
            )
          )
        )

        // ===== Anonymous Submission =====
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((text) =>
              text.setContent(
                lines(
                  '### Gửi ẩn danh',
                  '- Thông tin người gửi không được hiển thị và không thể được xem bởi bất kỳ ai, bao gồm cả **Ban quản lý**.'
                )
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId(CUSTOM_ID.BTN_CONFESSION_SEND_ANONYMOUS)
                .setLabel('Gửi ẩn danh')
                .setStyle(ButtonStyle.Success)
            )
        )

        // ===== Public Submission =====
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((text) =>
              text.setContent(
                lines(
                  '### Gửi công khai',
                  '- Tên và ảnh đại diện của bạn sẽ xuất hiện cùng nội dung confession khi được đăng.'
                )
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId(CUSTOM_ID.BTN_CONFESSION_SEND_PUBLIC)
                .setLabel('Gửi công khai')
                .setStyle(ButtonStyle.Danger)
            )
        )
    )
  }
}
