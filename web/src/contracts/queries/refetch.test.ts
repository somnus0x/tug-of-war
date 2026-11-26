import { describe, expect, it } from 'vitest'

import {
  LOG_BACKOFF_MAX_MS,
  LOG_CATCH_UP_MS,
  logsRefetchInterval,
  refetchIntervalFor,
} from './refetch'

describe('refetchIntervalFor', () => {
  it('polls every 2 s while the game is live or awaiting launch', () => {
    expect(refetchIntervalFor('buyIn')).toBe(2000)
    expect(refetchIntervalFor('awaitingLaunch')).toBe(2000)
  })

  it('polls every 5 s while waiting for captains', () => {
    expect(refetchIntervalFor('awaitingCaptains')).toBe(5000)
  })

  it('polls every 15 s in terminal phases', () => {
    expect(refetchIntervalFor('refunding')).toBe(15_000)
    expect(refetchIntervalFor('launched')).toBe(15_000)
    expect(refetchIntervalFor('cancelled')).toBe(15_000)
  })

  it('polls fast before the first answer', () => {
    expect(refetchIntervalFor(undefined)).toBe(2000)
  })
})

describe('logsRefetchInterval', () => {
  it('catches up quickly while there are more blocks to read', () => {
    expect(logsRefetchInterval({ phase: 'buyIn', hasMore: true, failures: 0 })).toBe(
      LOG_CATCH_UP_MS,
    )
  })

  it('follows the game cadence once caught up', () => {
    expect(logsRefetchInterval({ phase: 'buyIn', hasMore: false, failures: 0 })).toBe(2000)
  })

  it('backs off with a growing, bounded delay after failures, even mid catch-up', () => {
    const delays = [1, 2, 3, 6, 20].map((failures) =>
      logsRefetchInterval({ phase: 'buyIn', hasMore: true, failures }),
    )
    expect(delays).toEqual([4000, 8000, 16_000, LOG_BACKOFF_MAX_MS, LOG_BACKOFF_MAX_MS])
  })
})
