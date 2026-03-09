import type { APIMessageComponentEmoji } from 'discord.js'

/**
 * Parse Discord custom emoji string to API emoji object
 * Input: '<:name:id>' or '<a:name:id>' (animated)
 * Output: { id: string, name: string, animated?: boolean }
 */
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
