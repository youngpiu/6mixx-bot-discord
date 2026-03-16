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
  Message,
  TextChannel,
  VoiceChannel
} from 'discord.js'
import fs from 'node:fs'
import path from 'node:path'

import { MusicQuizSong } from 'generated/prisma/client'

import { NormalError } from '~/core/errorResponse'

import { SettingRepository } from '~/shared/repositories/settingRepository'
import { MessageUtil } from '~/shared/utils/messageUtil'
import { formatFields, lines } from '~/shared/utils/textUtil'

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

  public static async startSession(guild: Guild, voiceChannel: VoiceChannel) {
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
      voiceChannel
    )

    const player = createAudioPlayer()
    connection.subscribe(player)

    // 2. Initial State in Redis
    const state: MusicQuizState = {
      guildId: guild.id,
      textChannelId: textChannel.id,
      voiceChannelId: voiceChannel.id,
      isEnding: false,
      playedSongIds: []
    }
    await MusicQuizRedisService.saveState(guild.id, state)

    // 3. Handles in Memory
    MusicQuizSessionManager.setHandles(guild.id, { connection, player })

    // Listeners for Timing and Cleanup
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.stopSession(guild.id)
    })

    connection.on('error', (error) => {
      container.logger.error(
        `[MusicQuiz] Voice Connection Error (${guild.id}):`,
        error
      )
    })

    player.on(AudioPlayerStatus.Playing, async () => {
      await MusicQuizRedisService.updateState(guild.id, {
        roundStartTime: Date.now()
      })
    })

    player.on(AudioPlayerStatus.Idle, async () => {
      const currentState = await MusicQuizRedisService.getState(guild.id)
      // Nếu bài hát dừng lại (Idle) mà chưa kết thúc vòng (chưa có người đoán đúng/chưa hết giờ)
      // thì có thể là do lỗi stream/tập tin bị hỏng.
      if (
        currentState &&
        !currentState.isRoundEnded &&
        currentState.isPlaying
      ) {
        const textChannel = (await container.client.channels.fetch(
          currentState.textChannelId
        )) as TextChannel
        await MessageUtil.sendWithContainer(
          textChannel,
          'Bài hát gặp sự cố, đang chuyển sang bài khác...',
          10000
        )
        await this.handleTimeout(guild.id) // Tính là một round hỏng/không ai trả lời
      }
    })

    player.on('error', async (error) => {
      container.logger.error(
        `[MusicQuiz] Audio Player Error (${guild.id}):`,
        error
      )
      const currentState = await MusicQuizRedisService.getState(guild.id)
      if (currentState && !currentState.isRoundEnded) {
        const textChannel = (await container.client.channels.fetch(
          currentState.textChannelId
        )) as TextChannel
        await MessageUtil.sendWithContainer(
          textChannel,
          'Lỗi phát nhạc, tự động bỏ qua bài này.',
          10000
        )
        await this.nextRound(guild.id)
      }
    })

    // Start first round
    await this.nextRound(guild.id)
  }

  public static async nextRound(guildId: string) {
    const state = await MusicQuizRedisService.getState(guildId)
    const handles = MusicQuizSessionManager.getHandles(guildId)
    if (!state || state.isEnding || !handles) {
      return
    }

    if (handles.timeoutId) clearTimeout(handles.timeoutId)

    const playedIds = state.playedSongIds || []
    let song = await MusicQuizSongRepository.getRandom(playedIds)

    // Nếu đã chơi hết tất cả các bài trong db, xóa danh sách đã chơi để quay vòng lại
    if (!song && playedIds.length > 0) {
      await MusicQuizRedisService.updateState(guildId, { playedSongIds: [] })
      song = await MusicQuizSongRepository.getRandom([])
    }

    if (!song) {
      await this.stopSession(guildId)
      throw new NormalError(
        'Không tìm thấy bài hát nào trong dữ liệu! Hãy thêm bài hát trước khi bắt đầu.'
      )
    }

    if (!song.opusUrl || song.opusUrl.trim() === '') {
      const textChannel = (await container.client.channels.fetch(
        state.textChannelId
      )) as TextChannel
      await MessageUtil.sendWithContainer(
        textChannel,
        `Bài hát **${song.title}** bị lỗi, đang chuyển bài khác...`,
        10000
      )
      await this.nextRound(guildId)
      return
    }

    const nextPlayedIds = [...(state.playedSongIds || []), song.id]
    await MusicQuizRedisService.updateState(guildId, {
      currentSongId: song.id,
      isRoundEnded: false,
      isPlaying: false,
      playedSongIds: nextPlayedIds
    })

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
    const revealStats = {
      correctRatio:
        song.totalAttempts > 0
          ? ((song.correctAttempts / song.totalAttempts) * 100).toFixed(1)
          : '0.0',
      avgTime: song.avgGuessTime.toFixed(1),
      bestDisplay: song.bestGuessTime
        ? `${song.bestGuessTime.toFixed(1)}s`
        : '???'
    }

    const startEmbed = new EmbedBuilder()
      .setTitle('Đoán xem bài hát hiện tại là bài gì?')
      .setColor('#2ecc71')
      .setThumbnail('attachment://question.png')
      .setDescription(this.renderQuizDescription(song, revealStats, false))

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

        const resource = AudioProcessor.createRandomSegmentResource(
          song.opusUrl,
          startTime
        )
        currentHandles.player.play(resource)
        await MusicQuizRedisService.updateState(guildId, { isPlaying: true })

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
    if (!state || state.isEnding || state.isRoundEnded || !handles) return

    // Lock the round
    await MusicQuizRedisService.updateState(guildId, {
      isRoundEnded: true,
      isPlaying: false
    })

    const song = state.currentSongId
      ? await MusicQuizSongRepository.getById(state.currentSongId)
      : null

    // Stop music immediately
    handles.player.stop()

    if (!song) {
      await this.nextRound(guildId)
      return
    }

    // Persist the failed attempt and get updated data
    const updatedSong =
      (await MusicQuizSongRepository.updateStats(song.id, {
        correct: false
      })) || song

    const textChannel = (await container.client.channels.fetch(
      state.textChannelId
    )) as TextChannel

    let bestDisplay = '???'
    if (updatedSong.bestGuessTime) {
      bestDisplay = `${updatedSong.bestGuessTime.toFixed(1)}s`
      if (updatedSong.bestGuesserId) {
        bestDisplay += ` (<@${updatedSong.bestGuesserId}>)`
      }
    }

    const thumbAttachment = this.resolveThumbAttachment(updatedSong.thumbUrl)
    const revealStats = {
      correctRatio:
        updatedSong.totalAttempts > 0
          ? (
              (updatedSong.correctAttempts / updatedSong.totalAttempts) *
              100
            ).toFixed(1)
          : '0.0',
      avgTime: updatedSong.avgGuessTime.toFixed(1),
      bestDisplay: bestDisplay
    }

    const timeoutEmbed = new EmbedBuilder()
      .setTitle('Không có một ai trả lời đúng :(')
      .setColor('#f1c40f') // Yellowish like image 2
      .setDescription(
        `**[Nhấn vào đây để nghe thêm...](${updatedSong.songUrl ?? 'https://www.youtube.com'})**\n\n` +
          this.renderQuizDescription(updatedSong, revealStats, true)
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
    userId: string,
    message?: Message
  ): Promise<boolean> {
    const state = await MusicQuizRedisService.getState(guildId)
    const handles = MusicQuizSessionManager.getHandles(guildId)
    if (
      !state ||
      !state.currentSongId ||
      state.isEnding ||
      state.isRoundEnded ||
      !handles
    )
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
      // Atomic-ish lock: set isRoundEnded to true in Redis immediately
      await MusicQuizRedisService.updateState(guildId, {
        isRoundEnded: true,
        isPlaying: false
      })

      if (handles.timeoutId) clearTimeout(handles.timeoutId)

      // Stop music immediately
      handles.player.stop()

      const timeTaken = state.roundStartTime
        ? (Date.now() - state.roundStartTime) / 1000
        : 0

      // Persist the correct attempt and get updated data
      const updatedSong =
        (await MusicQuizSongRepository.updateStats(song.id, {
          correct: true,
          guessTime: timeTaken,
          guesserId: userId
        })) || song

      const displayName = updatedSong.title
      const thumbAttachment = this.resolveThumbAttachment(updatedSong.thumbUrl)

      // Best record handling
      let bestDisplay = '???'
      if (updatedSong.bestGuessTime) {
        bestDisplay = `${updatedSong.bestGuessTime.toFixed(1)}s`
        if (updatedSong.bestGuesserId) {
          bestDisplay += ` (<@${updatedSong.bestGuesserId}>)`
        }
      }

      const revealStats = {
        correctRatio:
          updatedSong.totalAttempts > 0
            ? (
                (updatedSong.correctAttempts / updatedSong.totalAttempts) *
                100
              ).toFixed(1)
            : '0.0',
        avgTime: updatedSong.avgGuessTime.toFixed(1),
        bestDisplay: bestDisplay
      }

      const successEmbed = new EmbedBuilder()
        .setTitle(`Bạn đoán đúng rồi!`)
        .setColor('#3498db') // Blue like your screenshot
        .setDescription(
          `Yay! Bạn đoán đúng sau **${timeTaken.toFixed(1)}s**.\n\n` +
            `**[Nhấn vào đây để nghe thêm...](${song.songUrl ?? 'https://www.youtube.com'})**\n\n` +
            this.renderQuizDescription(song, revealStats, true, displayName)
        )

      if (thumbAttachment)
        successEmbed.setThumbnail('attachment://thumbnail.jpg')

      if (message) {
        await message.reply({
          embeds: [successEmbed],
          files: thumbAttachment ? [thumbAttachment] : [],
          allowedMentions: { repliedUser: false }
        })
      } else {
        await textChannel.send({
          embeds: [successEmbed],
          files: thumbAttachment ? [thumbAttachment] : []
        })
      }

      // 3-second delay before next round
      setTimeout(() => this.nextRound(guildId), 3000)
      return true
    }

    return false
  }

  public static async stopSession(guildId: string) {
    const state = await MusicQuizRedisService.getState(guildId)
    const handles = MusicQuizSessionManager.getHandles(guildId)
    if (!state || state.isEnding) return

    await MusicQuizRedisService.updateState(guildId, { isEnding: true })
    if (handles?.timeoutId) clearTimeout(handles.timeoutId)

    // Reveal answer if there's an ongoing round
    if (state.currentSongId && !state.isRoundEnded) {
      const song = await MusicQuizSongRepository.getById(state.currentSongId)
      if (song) {
        // Persist failed attempt and get updated data
        const updatedSong =
          (await MusicQuizSongRepository.updateStats(song.id, {
            correct: false
          })) || song

        const textChannel = (await container.client.channels.fetch(
          state.textChannelId
        )) as TextChannel

        let bestDisplay = '???'
        if (updatedSong.bestGuessTime) {
          bestDisplay = `${updatedSong.bestGuessTime.toFixed(1)}s`
          if (updatedSong.bestGuesserId) {
            bestDisplay += ` (<@${updatedSong.bestGuesserId}>)`
          }
        }

        const thumbAttachment = this.resolveThumbAttachment(
          updatedSong.thumbUrl
        )
        const revealStats = {
          correctRatio:
            updatedSong.totalAttempts > 0
              ? (
                  (updatedSong.correctAttempts / updatedSong.totalAttempts) *
                  100
                ).toFixed(1)
              : '0.0',
          avgTime: updatedSong.avgGuessTime.toFixed(1),
          bestDisplay: bestDisplay
        }

        const timeoutEmbed = new EmbedBuilder()
          .setTitle('Không có một ai trả lời đúng :(')
          .setColor('#f1c40f')
          .setDescription(
            `**[Nhấn vào đây để nghe thêm...](${updatedSong.songUrl ?? 'https://www.youtube.com'})**\n\n` +
              this.renderQuizDescription(updatedSong, revealStats, true)
          )

        if (thumbAttachment)
          timeoutEmbed.setThumbnail('attachment://thumbnail.jpg')

        await textChannel.send({
          embeds: [timeoutEmbed],
          files: thumbAttachment ? [thumbAttachment] : []
        })
      }
    }

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

  private static renderQuizDescription(
    song: MusicQuizSong,
    stats: { correctRatio: string; avgTime: string; bestDisplay: string },
    reveal: boolean,
    overrideTitle?: string
  ): string {
    const fieldsData: [string, string | null | undefined][] = [
      [
        '📀 Tên bài hát',
        reveal ? `**${overrideTitle ?? song.title}**` : '**???**'
      ],
      ['🎤 Nghệ sĩ:', reveal ? `**${song.singer}**` : '**???**'],

      ...(song.album
        ? [
            ['🖼️ Album', reveal ? `**${song.album}**` : '**???**'] as [
              string,
              string
            ]
          ]
        : []),

      ['✅ Tỉ lệ đúng', `**${stats.correctRatio}%**`],
      ['⏱️ Trung bình', `**${stats.avgTime}s**`],
      ['🏅 Kỷ lục', `**${stats.bestDisplay}**`]
    ]

    const fields = formatFields(fieldsData, '', false)
    return lines(...fields)
  }
}
