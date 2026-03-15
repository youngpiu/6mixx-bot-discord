import { StreamType, createAudioResource } from '@discordjs/voice'
import { container } from '@sapphire/pieces'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { Readable } from 'node:stream'

/**
 * Helper class for processing audio using FFmpeg.
 * Always reads from local filesystem. Set MUSIC_QUIZ_BASE_PATH env to the root opus folder.
 */
export class AudioProcessor {
  /**
   * Resolves a relative or absolute opus path.
   * - If absolute (starts with /): use as-is.
   * - If relative: prepend MUSIC_QUIZ_BASE_PATH env variable.
   */
  private static resolvePath(opusPath: string): string {
    if (path.isAbsolute(opusPath)) return opusPath

    const basePath = process.env.MUSIC_QUIZ_BASE_PATH
    if (!basePath) {
      container.logger.warn(
        '[MusicQuiz] MUSIC_QUIZ_BASE_PATH is not set! Using relative path as-is.'
      )
      return opusPath
    }
    return path.join(basePath, opusPath)
  }

  /**
   * Creates an AudioResource from a 30-second segment of a local Opus file.
   * Uses input seek (-ss before -i) for near-instant start.
   *
   * @param opusPath - Relative path (e.g. `admare/tank/song.opus`) or absolute path.
   * @param startTime - Start time in seconds.
   */
  public static createRandomSegmentResource(
    opusPath: string,
    startTime: number
  ) {
    const resolvedPath = this.resolvePath(opusPath)
    container.logger.debug(
      `[MusicQuiz] FFmpeg: ${resolvedPath} from ${startTime}s`
    )

    const ffmpeg = spawn('ffmpeg', [
      '-ss',
      startTime.toString(), // Input seek = instant for local files
      '-t',
      '60',
      '-i',
      resolvedPath,
      '-vn',
      '-sn',
      '-dn',
      '-acodec',
      'libopus',
      '-b:a',
      '128k',
      '-f',
      'ogg',
      '-loglevel',
      'warning',
      '-hide_banner',
      'pipe:1'
    ])

    ffmpeg.stderr.on('data', (data) => {
      container.logger.error(
        `[MusicQuiz] FFmpeg Error: ${data.toString().trim()}`
      )
    })

    ffmpeg.on('close', (code) => {
      if (code !== 0 && code !== null) {
        container.logger.error(
          `[MusicQuiz] FFmpeg exited with code ${code} for: ${resolvedPath}`
        )
      }
    })

    return createAudioResource(ffmpeg.stdout as Readable, {
      inputType: StreamType.OggOpus
    })
  }
}
