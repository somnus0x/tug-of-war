export const LONG_SLEEP_MS = 5000

export const SETTLE_MS = 4000

export const isLongSleep = (hiddenAt: number | null, shownAt: number): boolean =>
  hiddenAt !== null && shownAt - hiddenAt >= LONG_SLEEP_MS
