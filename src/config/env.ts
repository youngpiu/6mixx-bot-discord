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
  MAIN_DISCORD_GUILD_ID: getEnvVar('MAIN_DISCORD_GUILD_ID'),
  TEST_DISCORD_GUILD_ID: getEnvVar('TEST_DISCORD_GUILD_ID'),
  DISCORD_CLIENT_ID: getEnvVar('DISCORD_CLIENT_ID'),
  NODE_ENV: getEnvVar('NODE_ENV', false) || 'development',
  SUPPORTER_DISCORD_ID: getEnvVar('SUPPORTER_DISCORD_ID'),
  BANK_ACCOUNT_NUMBER: getEnvVar('BANK_ACCOUNT_NUMBER'),
  BANK_NAME: getEnvVar('BANK_NAME'),
  BANK_ACCOUNT_NAME: getEnvVar('BANK_ACCOUNT_NAME')
}
