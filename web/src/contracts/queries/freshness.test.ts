import { describe, expect, it } from 'vitest'

import { currentGateAnswer, isFreshAnswer } from './freshness'

describe('isFreshAnswer', () => {
  it('accepts an answer that arrived after the question was asked', () => {
    expect(isFreshAnswer(2000, 1500)).toBe(true)
    expect(isFreshAnswer(1500, 1500)).toBe(true)
  })

  it('rejects a cached answer from before the question', () => {
    expect(isFreshAnswer(1000, 1500)).toBe(false)
  })

  it('rejects a query that has never answered', () => {
    expect(isFreshAnswer(0, 0)).toBe(false)
  })
})

describe('currentGateAnswer', () => {
  it('drops an ok answer while its refetch has failed and takes it back after a success', () => {
    const asked = 1000
    const ok = { ok: true }
    expect(currentGateAnswer({ data: ok, dataUpdatedAt: 1100, isError: false }, asked)).toEqual({
      data: ok,
      isFresh: true,
    })
    expect(currentGateAnswer({ data: ok, dataUpdatedAt: 1100, isError: true }, asked)).toEqual({
      data: undefined,
      isFresh: false,
    })
    expect(currentGateAnswer({ data: ok, dataUpdatedAt: 1500, isError: false }, asked)).toEqual({
      data: ok,
      isFresh: true,
    })
  })
})
