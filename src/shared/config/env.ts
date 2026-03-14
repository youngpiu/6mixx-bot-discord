/**
 * Fetches an environment variable by its key and optionally throws an error if it's missing.
 *
 * @param key - The name of the environment variable to retrieve.
 * @param required - Whether the variable is mandatory (default: true).
 * @returns The value of the environment variable, or an empty string if not found and not required.
 * @throws {Error} If the variable is required but not found.
 */
function getEnvVar(key: string, required = true): string {
  const value = process.env[key]
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value ?? ''
}

/**
 * Validated environment configuration object.
 * Contains database connection strings, Discord tokens, and application settings.
 */
export const env = {
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  REDIS_URL: getEnvVar('REDIS_URL'),
  DEFAULT_PREFIX: getEnvVar('DEFAULT_PREFIX', false) || '!',
  DISCORD_TOKEN: getEnvVar('DISCORD_TOKEN'),
  TEST_GUILDS_ID: (getEnvVar('TEST_GUILDS_ID', false) || '')
    .split(',')
    .filter(Boolean),
  NODE_ENV: getEnvVar('NODE_ENV', false) || 'development',
  OWNER_BOT_ID: getEnvVar('OWNER_BOT_ID'),
  BANK_ACCOUNT_NUMBER: getEnvVar('BANK_ACCOUNT_NUMBER'),
  BANK_NAME: getEnvVar('BANK_NAME'),
  BANK_ACCOUNT_NAME: getEnvVar('BANK_ACCOUNT_NAME'),

  LASTFM_API_KEY: getEnvVar('LASTFM_API_KEY', false),
  LASTFM_BOT_USERNAME: getEnvVar('LASTFM_BOT_USERNAME', false),
  LASTFM_BOT_PASSWORD: getEnvVar('LASTFM_BOT_PASSWORD', false)
}
