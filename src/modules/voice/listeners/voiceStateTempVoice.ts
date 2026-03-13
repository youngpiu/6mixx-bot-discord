import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import { ChannelType, VoiceState } from 'discord.js'

import { SettingRepository } from '~/shared/repositories/settingRepository'

import { TempVoiceProfileRepository } from '~/modules/voice/repositories/tempVoiceProfileRepository'
import { TempVoiceTrustedMemberRepository } from '~/modules/voice/repositories/tempVoiceTrustedMemberRepository'

/**
 * Listener that handles voice state updates to manage temporary voice channels.
 * Creates channels when users join the 'create' room and cleans up empty ones.
 */
@ApplyOptions<Listener.Options>({
  event: 'voiceStateUpdate'
})
export class VoiceStateTempVoiceListener extends Listener {
  /**
   * Main entry point for voice state updates.
   * @param oldState The previous voice state.
   * @param newState The current voice state.
   */
  public async run(oldState: VoiceState, newState: VoiceState) {
    const guild = newState.guild ?? oldState.guild
    if (!guild) return

    const member = newState.member ?? oldState.member
    if (!member || member.user.bot) return

    const setting = await SettingRepository.find(guild.id)
    if (!setting?.tempVoiceCreateChannelId) {
      await this.cleanupIfEmpty(oldState.channelId, guild.id)
      return
    }

    // Create temp channel when user joins the create room
    if (
      newState.channelId === setting.tempVoiceCreateChannelId &&
      oldState.channelId !== newState.channelId
    ) {
      await this.handleCreateRoom(newState, setting.tempVoiceCategoryId)
    }

    // Cleanup old channel if user left a temp room
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      await this.cleanupIfEmpty(oldState.channelId, guild.id)
    }
  }

  /**
   * Handles the creation of a new temporary voice channel.
   * @param newState The current voice state of the user.
   * @param tempVoiceCategoryId The ID of the category to create the channel in.
   */
  private async handleCreateRoom(
    newState: VoiceState,
    tempVoiceCategoryId?: string | null
  ) {
    const guild = newState.guild
    const member = newState.member
    if (!guild || !member) return

    const existing = await TempVoiceProfileRepository.findByOwnerId(
      guild.id,
      member.id
    )

    if (existing?.channelId) {
      const existingChannel = guild.channels.cache.get(existing.channelId)
      if (existingChannel && existingChannel.type === ChannelType.GuildVoice) {
        await member.voice.setChannel(existingChannel).catch((error) => {
          this.container.logger.error(
            '[TempVoice] Failed to move member to existing channel:',
            error
          )
        })
        return
      }

      await TempVoiceProfileRepository.clearActiveChannelById(
        existing.channelId
      ).catch(() => null)
    }

    const createChannel = guild.channels.cache.get(newState.channelId!)
    if (!createChannel || createChannel.type !== ChannelType.GuildVoice) {
      this.container.logger.warn(
        '[TempVoice] Create channel is missing or invalid.'
      )
      return
    }

    const category =
      (tempVoiceCategoryId
        ? guild.channels.cache.get(tempVoiceCategoryId)
        : null) ?? null

    const parentId =
      category && category.type === ChannelType.GuildCategory
        ? category.id
        : (createChannel.parentId ?? undefined)

    const defaultName = `Phòng của ${member.displayName || member.user.username}`
    // Reuse the `existing` variable from the earlier lookup to avoid a duplicate DB query
    const profile =
      existing ??
      (await TempVoiceProfileRepository.upsertProfile({
        guildId: guild.id,
        ownerId: member.id,
        name: defaultName
      }))

    const tempChannel = await guild.channels.create({
      name: profile.name || defaultName,
      type: ChannelType.GuildVoice,
      parent: parentId
    })

    const setupPromises: Promise<unknown>[] = []

    setupPromises.push(
      TempVoiceProfileRepository.setActiveChannel(
        guild.id,
        member.id,
        tempChannel.id
      )
    )

    if (profile.limit && profile.limit > 0) {
      setupPromises.push(
        tempChannel.setUserLimit(profile.limit).catch(() => null)
      )
    }

    if (profile.locked) {
      setupPromises.push(
        tempChannel.permissionOverwrites
          .edit(tempChannel.guild.roles.everyone.id, { Connect: false })
          .catch(() => null)
      )
    }

    const trusted = await TempVoiceTrustedMemberRepository.listByOwner(
      guild.id,
      member.id
    )

    if (trusted.length > 0) {
      setupPromises.push(
        ...trusted.map((t) =>
          tempChannel.permissionOverwrites
            .edit(t.userId, { Connect: true })
            .catch(() => null)
        )
      )
    }

    setupPromises.push(
      member.voice.setChannel(tempChannel).catch((error) => {
        this.container.logger.error(
          '[TempVoice] Failed to move member to temp channel:',
          error
        )
      })
    )

    await Promise.all(setupPromises)
  }

  /**
   * Cleans up a voice channel if it is empty and is a temporary voice channel.
   * @param channelId The ID of the channel to check.
   * @param guildId The ID of the guild.
   */
  private async cleanupIfEmpty(channelId: string | null, guildId: string) {
    if (!channelId) return

    const record = await TempVoiceProfileRepository.findByChannelId(channelId)
    if (!record) return

    const guild = this.container.client.guilds.cache.get(guildId)
    const channel = guild?.channels.cache.get(channelId)

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      await TempVoiceProfileRepository.clearActiveChannelById(channelId).catch(
        () => null
      )
      return
    }

    if (channel.members.size === 0) {
      await channel.delete().catch(() => null)
      await TempVoiceProfileRepository.clearActiveChannelById(channelId).catch(
        () => null
      )
    }
  }
}
