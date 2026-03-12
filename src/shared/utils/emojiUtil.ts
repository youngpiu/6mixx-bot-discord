import type { APIMessageComponentEmoji } from 'discord.js'

import { NUMBER_EMOJI } from '~/shared/constants/emojiConstant'

// Parse Discord custom emoji string to API emoji object
// Input: '<:name:id>' or '<a:name:id>' (animated)
// Output: { id: string, name: string, animated?: boolean }
export function parseEmoji(emojiString: string): APIMessageComponentEmoji {
  // Match custom emoji format: <:name:id> or <a:name:id>
  const match = emojiString.match(/^<(a)?:(\w+):(\d+)>$/)

  if (!match) {
    // Return as unicode emoji
    return { name: emojiString }
  }

  const [, animated, name, id] = match
  return {
    id,
    name,
    animated: animated === 'a'
  }
}

export function extractEmojiId(emojiString: string): string | null {
  const match = emojiString.match(/<a?:\w+:(\d+)>/)
  return match ? match[1] : null
}

// Emoji variants mapping: digit -> array of IDs [V1, V2, V3, V4, V5, V6]
const DIGIT_VARIANTS: Record<number, string[]> = {}

// Populate DIGIT_VARIANTS from NUMBER_EMOJI
Object.entries(NUMBER_EMOJI).forEach(([key, value]) => {
  const match = key.match(
    /^(ZERO|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE)_V(\d+)$/
  )
  if (match) {
    const digitMap: Record<string, number> = {
      ZERO: 0,
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5,
      SIX: 6,
      SEVEN: 7,
      EIGHT: 8,
      NINE: 9
    }
    const digit = digitMap[match[1]]
    const id = extractEmojiId(value)
    if (id) {
      if (!DIGIT_VARIANTS[digit]) DIGIT_VARIANTS[digit] = []
      DIGIT_VARIANTS[digit].push(id)
    }
  }
})

/**
 * Returns an array of emoji IDs for each digit of the given number.
 * Handles duplicate digits by cycling through available variants (V1-V6).
 * E.g. 11 → [ONE_V1_ID, ONE_V2_ID]
 */
export function getNumberEmojiIds(n: number): string[] {
  if (n <= 0) return []

  const digits = String(n).split('').map(Number)
  const usedCounts: Record<number, number> = {}
  const result: string[] = []

  for (const digit of digits) {
    const variants = DIGIT_VARIANTS[digit]
    if (!variants || variants.length === 0) continue

    const index = usedCounts[digit] ?? 0
    // Cycle variants if more than 6 duplicates (unlikely for normal word chain counts)
    result.push(variants[index % variants.length])
    usedCounts[digit] = index + 1
  }

  return result
}
