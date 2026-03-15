import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { VoiceChannel, VoiceState } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'

import { MusicQuizRedisService } from '../services/MusicQuizRedisService'
import { MusicQuizService } from '../services/MusicQuizService'
import { MusicQuizSessionManager } from '../services/MusicQuizSessionManager'

@ApplyOptions<Listener.Options>({
  event: 'voiceStateUpdate'
})
export class MusicQuizVoiceStateUpdateListener extends Listener {
  public async run(oldState: VoiceState, newState: VoiceState) {
    const { guild, member } = newState
    if (member?.user.bot) return

    const config = await SettingRepository.find(guild.id)
    if (!config?.nmixxQuizVoiceChannelId) return

    const quizVoiceChannelId = config.nmixxQuizVoiceChannelId

    // 1. User Joins the "Join to Start" channel
    if (
      newState.channelId === quizVoiceChannelId &&
      oldState.channelId !== quizVoiceChannelId
    ) {
      if (!(await MusicQuizSessionManager.isSessionActive(guild.id))) {
        await MusicQuizService.startSession(
          guild,
          newState.channel as VoiceChannel,
          member!.id
        )
      }
    }

    // 2. User Leaves the Voice channel
    if (oldState.channelId && !newState.channelId) {
      const state = await MusicQuizRedisService.getState(guild.id)
      if (state && oldState.channelId === state.voiceChannelId) {
        // Check if the channel is empty (excluding bot)
        const channel = oldState.channel
        if (channel && channel.members.filter((m) => !m.user.bot).size === 0) {
          await MusicQuizService.stopSession(guild.id)
        }
      }
    }
  }
}
