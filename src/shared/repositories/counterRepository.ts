import { container } from '@sapphire/pieces'

export class CounterRepository {
  /**
   * Generates a unique, sequential formatted code (e.g. DNT001, BU042).
   * Uses an atomic upsert on the generic AutoIncrement model to prevent race conditions.
   * Format: PREFIX + 3-digit number (padded).
   * 
   * @param guildId The Guild ID
   * @param type The distinct type of sequence (e.g., 'DONATION', 'TICKET_BUG')
   * @param prefix The string to prepend to the sequence (e.g., 'DNT', 'BU') 
   */
  public static async generateCode(guildId: string, type: string, prefix: string) {
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
   * Generates a generic sequential increment number
   * 
   * @param guildId The Guild ID
   * @param type The distinct type of sequence
   */
  public static async getNextSequence(guildId: string, type: string): Promise<number> {
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
