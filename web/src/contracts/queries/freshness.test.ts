import { describe, expect, it } from 'vitest'

import { isFreshAnswer } from './freshness'

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
