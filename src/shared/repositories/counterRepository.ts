import { container } from '@sapphire/pieces'

/**
 * Repository for managing auto-incrementing counters used for generating unique codes and sequences.
 */
export class CounterRepository {
  /**
   * Generates a unique, sequential formatted code (e.g., DNT001, BU042).
   * Uses an atomic upsert on the AutoIncrement model to ensure thread-safety and prevent race conditions.
   *
   * @example
   * ```ts
   * await CounterRepository.generateCode('guild-id', 'DONATION', 'DNT'); // returns 'DNT001'
   * ```
   *
   * @param guildId - The Discord Guild ID.
   * @param type - The distinct type of sequence (key for the counter).
   * @param prefix - The string to prepend to the padded sequence number.
   * @returns A string in the format: PREFIX + 3-digit padded number.
   */
  public static async generateCode(
    guildId: string,
    type: string,
    prefix: string
  ) {
    // Use atomic increment on AutoIncrement
    const result = await container.prisma.autoIncrement.upsert({
      where: {
        guildId_type: {
          guildId,
          type
        }
      },
      create: {
        guildId,
        type,
        counter: 1
      },
      update: {
        counter: {
          increment: 1
        }
      }
    })

    return `${prefix}${String(result.counter).padStart(3, '0')}`
  }

  /**
   * Retrieves the next available sequence number for a given guild and type.
   * Increments the counter atomically in the database.
   *
   * @param guildId - The Discord Guild ID.
   * @param type - The distinct type of sequence.
   * @returns A promise that resolves to the next sequence number.
   */
  public static async getNextSequence(
    guildId: string,
    type: string
  ): Promise<number> {
    const result = await container.prisma.autoIncrement.upsert({
      where: {
        guildId_type: { guildId, type }
      },
      create: { guildId, type, counter: 1 },
      update: { counter: { increment: 1 } }
    })

    return result.counter
  }
}
