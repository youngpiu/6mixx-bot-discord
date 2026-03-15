import {
  AudioPlayerStatus,
  VoiceConnectionStatus,
  createAudioPlayer
} from '@discordjs/voice'
import { container } from '@sapphire/pieces'
import {
  AttachmentBuilder,
  EmbedBuilder,
  Guild,
  TextChannel,
  VoiceChannel
} from 'discord.js'
import fs from 'node:fs'
import path from 'node:path'

import { NormalError } from '~/core/errorResponse'

import { SettingRepository } from '~/shared/repositories/settingRepository'

import { AudioProcessor } from '../helpers/AudioProcessor'
import { MusicQuizSongRepository } from '../repositories/MusicQuizSongRepository'
import { MusicQuizRedisService, MusicQuizState } from './MusicQuizRedisService'
import { MusicQuizSessionManager } from './MusicQuizSessionManager'
import { MusicQuizVoiceService } from './MusicQuizVoiceService'

export class MusicQuizService {
  /**
   * Resolves a relative thumbUrl to an absolute local path, then returns an AttachmentBuilder.
   * Discord can render local files as thumbnails via attachment:// scheme.
   */
  private static resolveThumbAttachment(thumbUrl: string | null) {
    if (!thumbUrl) return null

    const basePath = process.env.MUSIC_QUIZ_BASE_PATH
    const fullPath = basePath ? path.join(basePath, thumbUrl) : thumbUrl

    if (!fs.existsSync(fullPath)) return null

    return new AttachmentBuilder(fullPath, { name: 'thumbnail.jpg' })
  }

  public static async startSession(
    guild: Guild,
    voiceChannel: VoiceChannel,
    starterUserId: string
  ) {
    if (await MusicQuizSessionManager.isSessionActive(guild.id)) return

    const config = await SettingRepository.find(guild.id)
    if (!config?.nmixxQuizAnswerChannelId) return

    const textChannel = (await guild.channels.fetch(
      config.nmixxQuizAnswerChannelId
    )) as TextChannel
    if (!textChannel) return

    // 1. Join & Lock Voice Channel
    const connection = await MusicQuizVoiceService.joinAndLock(
      guild,
      voiceChannel,
      starterUserId
    )

    const player = createAudioPlayer()
    connection.subscribe(player)

    // 2. Initial State in Redis
    const state: MusicQuizState = {
      guildId: guild.id,
      textChannelId: textChannel.id,
      voiceChannelId: voiceChannel.id,
      isEnding: false
    }
    await MusicQuizRedisService.saveState(guild.id, state)

    // 3. Handles in Memory
    MusicQuizSessionManager.setHandles(guild.id, { connection, player })

    // Listeners for Timing and Cleanup
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      container.logger.info(
        `[MusicQuiz] Voice disconnected from guild ${guild.id}`
      )
      this.stopSession(guild.id)
    })

    connection.on('error', (error) => {
      container.logger.error(
        `[MusicQuiz] Voice Connection Error (${guild.id}):`,
        error
      )
    })

    player.on(AudioPlayerStatus.Playing, async () => {
      container.logger.debug(
        `[MusicQuiz] Player is PLAYING in guild ${guild.id}`
      )
      await MusicQuizRedisService.updateState(guild.id, {
        roundStartTime: Date.now()
      })
    })

    player.on(AudioPlayerStatus.Buffering, () => {
      container.logger.debug(
        `[MusicQuiz] Player is BUFFERING in guild ${guild.id}`
      )
    })

    player.on(AudioPlayerStatus.Idle, () => {
      container.logger.debug(`[MusicQuiz] Player is IDLE in guild ${guild.id}`)
    })

    player.on('error', (error) => {
      container.logger.error(
        `[MusicQuiz] Audio Player Error (${guild.id}):`,
        error
      )
    })

    // Start first round
    await this.nextRound(guild.id)
  }

  public static async nextRound(guildId: string) {
    container.logger.debug(
      `[MusicQuiz] Attempting nextRound for guild ${guildId}`
    )
    const state = await MusicQuizRedisService.getState(guildId)
    const handles = MusicQuizSessionManager.getHandles(guildId)
    if (!state || state.isEnding || !handles) {
      container.logger.warn(
        `[MusicQuiz] nextRound aborted: state=${!!state}, isEnding=${state?.isEnding}, handles=${!!handles}`
      )
      return
    }

    if (handles.timeoutId) clearTimeout(handles.timeoutId)

    const song = await MusicQuizSongRepository.getRandom()
    if (!song) {
      container.logger.error(
        `[MusicQuiz] No songs found in repository for guild ${guildId}`
      )
      await this.stopSession(guildId)
      throw new NormalError(
        'Không tìm thấy bài hát nào trong dữ liệu! Hãy thêm bài hát trước khi bắt đầu.'
      )
    }

    container.logger.info(
      `[MusicQuiz] Picked song: ${song.title} (ID: ${song.id}) for guild ${guildId}`
    )

    if (!song.opusUrl || song.opusUrl.trim() === '') {
      container.logger.error(
        `[MusicQuiz] Song ID ${song.id} has empty opusUrl! Skipping to next...`
      )
      const textChannel = (await container.client.channels.fetch(
        state.textChannelId
      )) as TextChannel
      await textChannel.send(
        `⚠️ Lỗi: Bài hát **${song.title}** chưa có link âm thanh. Đang chuyển bài...`
      )
      await this.nextRound(guildId)
      return
    }

    await MusicQuizRedisService.updateState(guildId, { currentSongId: song.id })

    const textChannel = (await container.client.channels.fetch(
      state.textChannelId
    )) as TextChannel

    // 1. Question Embed
    const questionImgPath = path.resolve(
      process.cwd(),
      'data/images/no-question.png'
    )
    const placeholderImg = new AttachmentBuilder(questionImgPath, {
      name: 'question.png'
    })
    // Calculate Display Stats for Question
    const totalAttempts = song.totalAttempts
    const correctRatio =
      totalAttempts > 0
        ? ((song.correctAttempts / totalAttempts) * 100).toFixed(1)
        : '0.0'
    const avgTime = song.avgGuessTime.toFixed(1)
    let bestDisplay = 'No Record'
    if (song.bestGuessTime) {
      bestDisplay = `${song.bestGuessTime.toFixed(1)}s`
    }

    const startEmbed = new EmbedBuilder()
      .setTitle('What song do you think is on right now?')
      .setColor('#2ecc71')
      .setThumbnail('attachment://question.png')
      .setDescription(
        '```\n' +
          `📀 Song Title: ???\n` +
          `🎤 Singer: ??\n` +
          `🖼️ Album: ??\n` +
          `✅ Correct: ${correctRatio}%\n` +
          `⏱️ Avg Time: ${avgTime}s\n` +
          `🏅 Record: ${bestDisplay}\n` +
          '```'
      )

    await textChannel.send({ embeds: [startEmbed], files: [placeholderImg] })

    // Play after 2s delay
    setTimeout(() => {
      // Re-fetch state and handles inside timeout to ensure session is still active
      const checkState = async () => {
        const currentState = await MusicQuizRedisService.getState(guildId)
        const currentHandles = MusicQuizSessionManager.getHandles(guildId)
        if (!currentState || currentState.isEnding || !currentHandles) return

        const duration = song.duration || 180
        const maxStart = Math.max(0, duration - 70)
        const startTime = Math.floor(Math.random() * maxStart)

        container.logger.debug(
          `[MusicQuiz] Playing segment: ${song.opusUrl} from ${startTime}s`
        )
        const resource = AudioProcessor.createRandomSegmentResource(
          song.opusUrl,
          startTime
        )
        currentHandles.player.play(resource)

        // 1m timer starts when music starts
        if (currentHandles.timeoutId) clearTimeout(currentHandles.timeoutId)
        currentHandles.timeoutId = setTimeout(
          () => this.handleTimeout(guildId),
          60000
        )
      }
      checkState()
    }, 2000)
  }

  private static async handleTimeout(guildId: string) {
    const state = await MusicQuizRedisService.getState(guildId)
    const handles = MusicQuizSessionManager.getHandles(guildId)
    if (!state || state.isEnding || !handles) return

    const song = state.currentSongId
      ? await MusicQuizSongRepository.getById(state.currentSongId)
      : null

    // Stop music immediately
    handles.player.stop()

    if (!song) {
      await this.nextRound(guildId)
      return
    }

    // Persist the failed attempt to DB
    await MusicQuizSongRepository.updateStats(song.id, { correct: false })

    const textChannel = (await container.client.channels.fetch(
      state.textChannelId
    )) as TextChannel

    // Calculate Stats
    const totalAttempts = song.totalAttempts + 1
    const correctRatio =
      totalAttempts > 0
        ? ((song.correctAttempts / totalAttempts) * 100).toFixed(1)
        : '0.0'
    const avgTime = song.avgGuessTime.toFixed(1)

    let bestDisplay = 'No Record'
    if (song.bestGuessTime) {
      bestDisplay = `${song.bestGuessTime.toFixed(1)}s`
      if (song.bestGuesserId) {
        bestDisplay += ` (<@${song.bestGuesserId}>)`
      }
    }

    const thumbAttachment = this.resolveThumbAttachment(song.thumbUrl)
    const timeoutEmbed = new EmbedBuilder()
      .setTitle('No one seems to have the answer just yet')
      .setColor('#f1c40f') // Yellowish like image 2
      .setDescription(
        `**To hear more:** [Click Me](${song.songUrl ?? 'https://www.youtube.com'})\n` +
          '```\n' +
          `📀 Song Title: ${song.title}\n` +
          `🎤 Singer: ${song.singer}\n` +
          `🖼️ Album: ${song.album ?? '--'}\n` +
          `✅ Correct: ${correctRatio}%\n` +
          `⏱️ Avg Time: ${avgTime}s\n` +
          `🏅 Record: ${bestDisplay}\n` +
          '```'
      )

    if (thumbAttachment) timeoutEmbed.setThumbnail('attachment://thumbnail.jpg')

    await textChannel.send({
      embeds: [timeoutEmbed],
      files: thumbAttachment ? [thumbAttachment] : []
    })

    // 3-second delay before next round
    setTimeout(() => this.nextRound(guildId), 3000)
  }

  public static async handleGuess(
    guildId: string,
    guess: string,
    userId: string
  ): Promise<boolean> {
    const state = await MusicQuizRedisService.getState(guildId)
    const handles = MusicQuizSessionManager.getHandles(guildId)
    if (!state || !state.currentSongId || state.isEnding || !handles)
      return false

    const song = await MusicQuizSongRepository.getById(state.currentSongId)
    if (!song) return false

    const normalizedGuess = guess.toLowerCase().trim()
    const isCorrect = song.aliases.some(
      (n) => n.toLowerCase().trim() === normalizedGuess
    )

    const textChannel = (await container.client.channels.fetch(
      state.textChannelId
    )) as TextChannel

    if (isCorrect) {
      if (handles.timeoutId) clearTimeout(handles.timeoutId)

      // Stop music immediately
      handles.player.stop()

      const timeTaken = state.roundStartTime
        ? (Date.now() - state.roundStartTime) / 1000
        : 0

      await MusicQuizSongRepository.updateStats(song.id, {
        correct: true,
        guessTime: timeTaken,
        guesserId: userId
      })

      const displayName = song.title
      const thumbAttachment = this.resolveThumbAttachment(song.thumbUrl)

      // Calculate Stats
      const totalAttempts = song.totalAttempts + 1
      const correctAttempts = song.correctAttempts + 1
      const correctRatio =
        totalAttempts > 0
          ? ((correctAttempts / totalAttempts) * 100).toFixed(1)
          : '100.0'
      const avgTime = song.avgGuessTime.toFixed(1)

      // Best record handling
      let bestDisplay = 'No Record'
      if (song.bestGuessTime) {
        bestDisplay = `${song.bestGuessTime.toFixed(1)}s`
        if (song.bestGuesserId) {
          bestDisplay += ` (<@${song.bestGuesserId}>)`
        }
      }

      const successEmbed = new EmbedBuilder()
        .setTitle(`<@${userId}>, You guessed it right!`)
        .setColor('#3498db') // Blue like your screenshot
        .setDescription(
          `Yay! You got it in **${timeTaken.toFixed(1)}s**! 🥳 You've gained **1** points! 🎶\n\n` +
            `**To hear more:** [Click Me](${song.songUrl ?? 'https://www.youtube.com'})\n` +
            '```\n' +
            `📀 Song Title: ${displayName}\n` +
            `🎤 Singer: ${song.singer}\n` +
            `🖼️ Album: ${song.album ?? '--'}\n` +
            `✅ Correct: ${correctRatio}%\n` +
            `⏱️ Avg Time: ${avgTime}s\n` +
            `🏅 Record: ${bestDisplay}\n` +
            '```'
        )

      if (thumbAttachment)
        successEmbed.setThumbnail('attachment://thumbnail.jpg')

      await textChannel.send({
        embeds: [successEmbed],
        files: thumbAttachment ? [thumbAttachment] : []
      })

      // 3-second delay before next round
      setTimeout(() => this.nextRound(guildId), 3000)
      return true
    } else {
      // Incorrect guess
      await textChannel.send(`<@${userId}> bạn đoán sai rồi!`)
      return false
    }
  }

  public static async stopSession(guildId: string) {
    const state = await MusicQuizRedisService.getState(guildId)
    const handles = MusicQuizSessionManager.getHandles(guildId)
    if (!state || state.isEnding) return

    await MusicQuizRedisService.updateState(guildId, { isEnding: true })
    if (handles?.timeoutId) clearTimeout(handles.timeoutId)

    handles?.player.stop()

    const guild = await container.client.guilds.fetch(guildId)
    if (handles) {
      await MusicQuizVoiceService.unlockAndLeave(
        guild,
        state.voiceChannelId,
        handles.connection
      )
    }

    await MusicQuizSessionManager.clearSession(guildId)
  }
}
