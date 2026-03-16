import {
  VoiceConnection,
  VoiceConnectionStatus,
  joinVoiceChannel
} from '@discordjs/voice'
import { Guild, VoiceChannel } from 'discord.js'

export class MusicQuizVoiceService {
  public static async joinAndLock(
    guild: Guild,
    voiceChannel: VoiceChannel
  ): Promise<VoiceConnection> {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator
    })

    // No longer locking the channel to allow multiple participants
    return connection
  }

  public static async unlockAndLeave(
    guild: Guild,
    _voiceChannelId: string,
    connection: VoiceConnection
  ) {
    if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
      connection.destroy()
    }
  }
}
