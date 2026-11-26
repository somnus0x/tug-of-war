import { describe, expect, it } from 'vitest'

import { LONG_SLEEP_MS, isLongSleep } from './tab-sleep'

describe('isLongSleep', () => {
  it('treats only a hide longer than a few polls as a sleep', () => {
    expect(isLongSleep(1000, 1000 + LONG_SLEEP_MS)).toBe(true)
    expect(isLongSleep(1000, 1800)).toBe(false)
    expect(isLongSleep(null, 99_999)).toBe(false)
  })
})
