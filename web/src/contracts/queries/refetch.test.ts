import { describe, expect, it } from 'vitest'

import { refetchIntervalFor } from './refetch'

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
