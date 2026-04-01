// Utilities for formatting and manipulating text content for Discord messages
import { inlineCode } from 'discord.js'

/**
 * Join multiple lines of text with a newline character.
 * Filters out falsy values (false, null, undefined).
 *
 * @param text - The text segments to join.
 * @returns A single string with lines joined by newlines.
 */
export const lines = (...text: (string | false | null | undefined)[]) =>
  text.filter(Boolean).join('\n')

/**
 * Wraps multiple lines of text in a code block.
 * Filters out falsy values before wrapping.
 *
 * @param text - The text segments to include in the code block.
 * @returns A string representing a markdown code block.
 */
export const codeLines = (...text: (string | false | null | undefined)[]) =>
  `\`\`\`\n${text.filter(Boolean).join('\n')}\`\`\``

/**
 * Normalizes multiline text content for cleaner message output.
 * - Converts CRLF/CR to LF
 * - Removes leading/trailing blank lines
 * - Collapses consecutive blank lines to a single blank line
 *
 * @param text - Input text.
 * @returns Normalized text.
 */
export function normalizeMultilineText(text: string): string {
  const invisibleBlankRegex = /[\u200B-\u200D\uFEFF\u2060\u00A0\u2800]/g

  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(invisibleBlankRegex, '').trim())

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift()
  }

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop()
  }

  if (lines.length === 0) return ''

  const collapsed: string[] = []
  let previousWasBlank = false

  for (const line of lines) {
    const isBlank = line.trim() === ''
    if (isBlank) {
      if (!previousWasBlank) {
        collapsed.push('')
      }
      previousWasBlank = true
      continue
    }

    collapsed.push(line)
    previousWasBlank = false
  }

  return collapsed.join('\n')
}

type Field = [key: string, value: string | null | undefined]

/**
 * Formats an array of key-value pairs into aligned, readable lines for Discord.
 * Keys are padded to the longest key's length and wrapped in inline code.
 *
 * @param fields - Array of [key, value] tuples.
 * @param prefix - Prefix to add to each line (default: '- ').
 * @returns An array of formatted strings.
 */
export function formatFields(
  fields: Field[],
  prefix = '- ',
  align = true
): string[] {
  const valid = fields.filter(([, v]) => v != null)

  const maxKeyLength = align ? Math.max(...valid.map(([k]) => k.length), 0) : 0

  return valid.map(([key, value]) => {
    const formattedKey = align ? key.padEnd(maxKeyLength, ' ') : key
    return `${prefix}${inlineCode(formattedKey + ':')} ${value}`
  })
}

/**
 * Partially masks a string (usually a Snowflake ID) for privacy.
 * Replaces the start and end with 'x' while keeping a middle section visible.
 *
 * @param id - The ID to encrypt/mask.
 * @returns The masked ID string.
 */
export function encryptId(id: string): string {
  return `xxxxxx${id.slice(6, 12)}xxxxxx`
}
