import { ApplyOptions } from '@sapphire/decorators'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import { ChannelType, ContainerBuilder } from 'discord.js'

import { RECRUITMENT_MESSAGE } from '~/shared/constants/recruitmentConstant'
import { MessageUtil } from '~/shared/utils/messageUtil'

/**
 * Task that automatically sends a recruitment message in active voice channels.
 * Runs every 30 minutes.
 */
@ApplyOptions<ScheduledTask.Options>({
  interval: 30 * 60 * 1000, // 30 minutes
  enabled: true,
  customJobOptions: {
    removeOnComplete: true
  }
})
export class VoiceRecruitmentTask extends ScheduledTask {
  /**
   * Executes the recruitment message task.
   * Iterates through all guilds and their voice channels to find active ones.
   */
  public override async run() {
    this.container.logger.info(
      '[VoiceRecruitmentTask] Starting periodic recruitment task...'
    )

    const guilds = this.container.client.guilds.cache

    for (const guild of guilds.values()) {
      const voiceChannels = guild.channels.cache.filter(
        (channel) => channel.type === ChannelType.GuildVoice
      )

      for (const channel of voiceChannels.values()) {
        if (channel.type !== ChannelType.GuildVoice) continue

        // Check if there are human members in the voice channel
        const humanMembers = channel.members.filter((m) => !m.user.bot)
        if (humanMembers.size === 0) continue

        // Prepare the recruitment message
        const recruitmentContainer =
          new ContainerBuilder().addTextDisplayComponents((t) =>
            t.setContent(
              `${RECRUITMENT_MESSAGE.HEADER}\n\n${RECRUITMENT_MESSAGE.CONTENT}`
            )
          )

        // Send the message as silent (SuppressNotifications) and auto-delete after the specified duration
        await MessageUtil.sendWithContainer(
          channel,
          recruitmentContainer,
          RECRUITMENT_MESSAGE.AUTO_DELETE_MS
        ).catch((error) => {
          this.container.logger.error(
            `[VoiceRecruitmentTask] Failed to send message to channel ${channel.id} in guild ${guild.id}:`,
            error
          )
        })
      }
    }

    this.container.logger.info(
      '[VoiceRecruitmentTask] Periodic recruitment task completed.'
    )
  }
}
