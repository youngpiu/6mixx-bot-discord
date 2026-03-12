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

type Field = [key: string, value: string | null | undefined]

/**
 * Formats an array of key-value pairs into aligned, readable lines for Discord.
 * Keys are padded to the longest key's length and wrapped in inline code.
 *
 * @param fields - Array of [key, value] tuples.
 * @param prefix - Prefix to add to each line (default: '- ').
 * @returns An array of formatted strings.
 */
export function formatFields(fields: Field[], prefix = '- '): string[] {
  const valid = fields.filter(([, v]) => v != null)

  const maxKeyLength = Math.max(...valid.map(([k]) => k.length), 0)

  return valid.map(
    ([key, value]) =>
      `${prefix}${inlineCode(key.padEnd(maxKeyLength, ' ') + ':')} ${value}`
  )
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
