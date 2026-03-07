import { TIME } from '~/constants/timeConstant'

export const DONATION_CONFIG = {
  AMOUNT: {
    MIN: 1000,
    MAX: 500000
  },
  QR: {
    BASE_URL: 'https://qr.sepay.vn/img'
  },
  TIMEOUT: {
    PAYMENT_WAIT: TIME.M10
  }
} as const
