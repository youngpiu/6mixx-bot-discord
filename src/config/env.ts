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
  TEST_GUILDS_ID: (getEnvVar('TEST_GUILDS_ID', false) || '').split(',').filter(Boolean),
  NODE_ENV: getEnvVar('NODE_ENV', false) || 'development',
  OWNER_BOT_ID: getEnvVar('OWNER_BOT_ID'),
  BANK_ACCOUNT_NUMBER: getEnvVar('BANK_ACCOUNT_NUMBER'),
  BANK_NAME: getEnvVar('BANK_NAME'),
  BANK_ACCOUNT_NAME: getEnvVar('BANK_ACCOUNT_NAME')
}
