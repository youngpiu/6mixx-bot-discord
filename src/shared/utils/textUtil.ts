import { inlineCode } from 'discord.js'

export const lines = (...text: (string | false | null | undefined)[]) =>
  text.filter(Boolean).join('\n')
export const codeLines = (...text: (string | false | null | undefined)[]) =>
  `\`\`\`\n${text.filter(Boolean).join('\n')}\`\`\``

type Field = [key: string, value: string | null | undefined]

export function formatFields(fields: Field[], prefix = '- '): string[] {
  const valid = fields.filter(([, v]) => v != null)

  const maxKeyLength = Math.max(...valid.map(([k]) => k.length), 0)

  return valid.map(
    ([key, value]) => `${prefix}${inlineCode(key.padEnd(maxKeyLength, ' ') + ':')} ${value}`
  )
}

export function encryptId(id: string): string {
  return `xxxxxx${id.slice(6, 12)}xxxxxx`
}
