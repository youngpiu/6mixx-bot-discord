import { container } from '@sapphire/pieces'

/**
 * Repository for managing music quiz songs.
 */
export class MusicQuizSongRepository {
  /**
   * Retrieves a random song from the database.
   */
  public static async getRandom() {
    const total = await container.prisma.musicQuizSong.count()
    if (total === 0) return null

    const randomIndex = Math.floor(Math.random() * total)
    return container.prisma.musicQuizSong.findFirst({
      skip: randomIndex
    })
  }

  /**
   * Retrieves a song by ID.
   */
  public static async getById(id: number) {
    return container.prisma.musicQuizSong.findUnique({
      where: { id }
    })
  }

  /**
   * Updates song statistics after a guess.
   */
  public static async updateStats(
    id: number,
    data: {
      correct: boolean
      guessTime?: number
      guesserId?: string
    }
  ) {
    const song = await container.prisma.musicQuizSong.findUnique({
      where: { id }
    })

    if (!song) return

    const totalAttempts = song.totalAttempts + 1
    const correctAttempts = data.correct
      ? song.correctAttempts + 1
      : song.correctAttempts

    const avgGuessTime =
      data.correct && data.guessTime
        ? (song.avgGuessTime * song.correctAttempts + data.guessTime) /
          correctAttempts
        : song.avgGuessTime

    let bestGuessTime = song.bestGuessTime
    let bestGuesserId = song.bestGuesserId

    if (
      data.correct &&
      data.guessTime &&
      (!bestGuessTime || data.guessTime < bestGuessTime)
    ) {
      bestGuessTime = data.guessTime
      bestGuesserId = data.guesserId || null
    }

    return container.prisma.musicQuizSong.update({
      where: { id },
      data: {
        totalAttempts,
        correctAttempts,
        avgGuessTime,
        bestGuessTime,
        bestGuesserId
      }
    })
  }
}
