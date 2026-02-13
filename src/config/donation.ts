import { DELETE_REPLY_TIMEOUT } from '~/config/time'

export const DONATION_CONFIG = {
  AMOUNT: {
    MIN: 1000,
    MAX: 500000
  },
  QR: {
    BASE_URL: 'https://qr.sepay.vn/img'
  },
  TIMEOUT: {
    PAYMENT_WAIT: DELETE_REPLY_TIMEOUT.VERY_LONG // 10 minutes
  }
} as const
