// Utility for formatting dates according to Vietnamese locale and time zone
/**
 * Formats a Date object into a human-readable string in Vietnamese locale.
 * Uses 'Asia/Ho_Chi_Minh' time zone with short date and time styles.
 *
 * @param date - The Date object to format.
 * @returns A formatted string (e.g., '12/03/2026, 23:20').
 */
export const formatTime = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(date)
