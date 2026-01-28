export const CACHE_TTL = {
  IMMEDIATE: 0, // 0s
  VERY_SHORT: 60, // 1m
  SHORT: 300, // 5m
  MEDIUM: 600, // 10m
  LONG: 1800, // 30m
  VERY_LONG: 3600, // 1h
  INFINITE: 604800 // 7d
} as const

export const DELETE_REPLY_TIMEOUT = {
  IMMEDIATE: 0, // 0s
  VERY_SHORT: 10, // 10s
  SHORT: 30, // 30s
  MEDIUM: 60, // 1m
  LONG: 300, // 5m
  VERY_LONG: 600, // 10m
  EXTREME: 1800 // 30m
} as const
