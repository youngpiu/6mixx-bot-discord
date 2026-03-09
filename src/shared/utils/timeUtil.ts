// Utility for formatting dates according to Vietnamese locale and time zone
export const formatTime = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(date)
