function getEnvVar(key: string, required = true): string {
  const value = process.env[key]
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value ?? ''
}

export const env = {
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  REDIS_URL: getEnvVar('REDIS_URL'),
  DEFAULT_PREFIX: getEnvVar('DEFAULT_PREFIX', false) || '!',
  DISCORD_TOKEN: getEnvVar('DISCORD_TOKEN'),
  DISCORD_GUILD_ID: getEnvVar('DISCORD_GUILD_ID'),
  DISCORD_CLIENT_ID: getEnvVar('DISCORD_CLIENT_ID')
}
