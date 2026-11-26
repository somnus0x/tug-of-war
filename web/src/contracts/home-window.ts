import type { Phase } from '@/lib/phase'

import { classifyError } from './tx/classify-error'

export const RECENT_LIMIT = 20

export const recentIndices = (count: number, limit: number = RECENT_LIMIT): number[] => {
  const total = Number.isSafeInteger(count) && count > 0 ? count : 0
  const size = Math.min(total, Math.max(0, limit))
  return Array.from({ length: size }, (_unused, offset) => total - 1 - offset)
}

export const newestFirst = <T>(items: readonly T[], limit: number = RECENT_LIMIT): T[] =>
  recentIndices(items.length, limit).flatMap((index) => {
    const item = items[index]
    return item === undefined ? [] : [item]
  })

export type IndexRead<T> =
  | { readonly status: 'success'; readonly result: T }
  | { readonly status: 'failure'; readonly error: Error }

export const INDEX_PAST_END = 'GameIndexOutOfRange'

export const isIndexPastEnd = (error: unknown): boolean =>
  classifyError(error, 'createGame').name === INDEX_PAST_END

export const readValues = <T>(
  results: readonly IndexRead<T>[],
  tolerated: (error: unknown) => boolean = isIndexPastEnd,
): T[] =>
  results.flatMap((item) => {
    if (item.status === 'success') {
      return [item.result]
    }
    if (tolerated(item.error)) {
      return []
    }
    throw item.error
  })

export const ROW_SLOW_MS = 30_000

export const ROW_LIVE_MS = 2000

export const rowRefetchMs = (phase: Phase | undefined, failed: boolean): number | false => {
  if (phase === 'buyIn' || phase === 'awaitingLaunch') {
    return ROW_LIVE_MS
  }
  if (phase === 'awaitingCaptains' || failed || phase === undefined) {
    return ROW_SLOW_MS
  }
  return false
}
