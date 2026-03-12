// Time constants in milliseconds for common durations (seconds, minutes, hours, days)
const s = (v: number) => v * 1000
const m = (v: number) => v * 60_000
const h = (v: number) => v * 3_600_000
const d = (v: number) => v * 86_400_000

export const TIME = {
  S3: s(3),
  S5: s(5),
  S10: s(10),
  S15: s(15),
  S20: s(20),
  S30: s(30),

  M1: m(1),
  M2: m(2),
  M3: m(3),
  M5: m(5),
  M10: m(10),
  M15: m(15),
  M20: m(20),
  M30: m(30),

  H1: h(1),
  H2: h(2),
  H3: h(3),
  H5: h(5),
  H10: h(10),
  H15: h(15),
  H20: h(20),
  H24: h(24),

  D1: d(1),
  D2: d(2),
  D3: d(3),
  D5: d(5),
  D7: d(7),
  D14: d(14),
  D30: d(30)
} as const
