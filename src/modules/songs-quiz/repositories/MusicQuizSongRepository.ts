import { container } from '@sapphire/pieces'

/**
 * Repository for managing music quiz songs.
 */
export class MusicQuizSongRepository {
  /**
   * Truy xuất một bài hát ngẫu nhiên, có thể loại trừ các bài đã chơi.
   */
  public static async getRandom(excludeIds: number[] = []) {
    const where = {
      id: { notIn: excludeIds }
    }

    const total = await container.prisma.musicQuizSong.count({ where })
    if (total === 0) return null

    const randomIndex = Math.floor(Math.random() * total)
    return container.prisma.musicQuizSong.findFirst({
      where,
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

  /**
   * Truy xuất bảng xếp hạng những người có nhiều kỷ lục nhất.
   */
  public static async getTopLeaderboard(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit

    const total = await container.prisma.user.count({
      where: {
        musicQuizBestGuesses: { some: {} }
      }
    })

    const topUsers = await container.prisma.user.findMany({
      where: {
        musicQuizBestGuesses: {
          some: {} // Có ít nhất 1 kỷ lục
        }
      },
      select: {
        id: true,
        _count: {
          select: { musicQuizBestGuesses: true }
        }
      },
      orderBy: {
        musicQuizBestGuesses: {
          _count: 'desc'
        }
      },
      take: limit,
      skip
    })

    const totalPages = Math.ceil(total / limit)

    return {
      items: topUsers.map((u) => ({
        userId: u.id,
        count: u._count.musicQuizBestGuesses
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  }

  /**
   * Adds a new song to the database.
   */
  public static async create(data: {
    title: string
    aliases: string[]
    singer: string
    album?: string
    opusUrl: string
    songUrl?: string
    thumbUrl?: string
    duration?: number
  }) {
    return container.prisma.musicQuizSong.create({
      data: {
        ...data,
        totalAttempts: 0,
        correctAttempts: 0,
        avgGuessTime: 0
      }
    })
  }
}
