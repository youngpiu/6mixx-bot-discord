import {
  VoiceConnection,
  VoiceConnectionStatus,
  joinVoiceChannel
} from '@discordjs/voice'
import { container } from '@sapphire/pieces'
import { Guild, PermissionFlagsBits, VoiceChannel } from 'discord.js'

export class MusicQuizVoiceService {
  public static async joinAndLock(
    guild: Guild,
    voiceChannel: VoiceChannel,
    starterUserId: string
  ): Promise<VoiceConnection> {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator
    })

    // Lock channel: Only bot and starter can connect
    await voiceChannel.permissionOverwrites.set([
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.Connect]
      },
      {
        id: starterUserId,
        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
      },
      {
        id: container.client.user!.id,
        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
      }
    ])

    return connection
  }

  public static async unlockAndLeave(
    guild: Guild,
    voiceChannelId: string,
    connection: VoiceConnection
  ) {
    if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
      connection.destroy()
    }

    const voiceChannel = (await guild.channels.fetch(
      voiceChannelId
    )) as VoiceChannel
    if (voiceChannel) {
      await voiceChannel.permissionOverwrites.delete(guild.roles.everyone)
      await voiceChannel.permissionOverwrites.delete(container.client.user!.id)
    }
  }
}
