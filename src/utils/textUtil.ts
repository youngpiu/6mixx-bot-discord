export const lines = (...text: (string | false | null | undefined)[]) =>
  text.filter(Boolean).join('\n')
