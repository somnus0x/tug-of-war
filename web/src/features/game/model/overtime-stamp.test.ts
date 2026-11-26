import { describe, expect, it } from 'vitest'

import { overtimeStampOf, stampMs, stampStep } from './overtime-stamp'

describe('overtimeStampOf', () => {
  it('stamps the added time when the extension count rises', () => {
    expect(overtimeStampOf(0, 1, 30)).toBe('+30s')
    expect(overtimeStampOf(1, 3, 30)).toBe('+60s')
  })

  it('stays quiet when the count holds or falls', () => {
    expect(overtimeStampOf(2, 2, 30)).toBeNull()
    expect(overtimeStampOf(2, 0, 30)).toBeNull()
  })
})

describe('stampMs', () => {
  it('holds a still stamp for two seconds', () => {
    expect(stampMs(true)).toBe(2000)
    expect(stampMs(false)).toBeGreaterThanOrEqual(2000)
  })
})

describe('stampStep', () => {
  const base = { game: 'a', seen: 1 }

  it('stamps a rise seen while watching', () => {
    expect(stampStep(base, 'a', 2, 30, false)).toEqual({
      baseline: { game: 'a', seen: 2 },
      text: '+30s',
      clear: false,
    })
    expect(stampStep(base, 'a', 1, 30, false)).toBeNull()
  })

  it('takes in a rise that happened while the tab was away without a stamp', () => {
    expect(stampStep(base, 'a', 3, 30, true)).toMatchObject({ text: null, clear: false })
  })

  it('clears the stamp for another game or a lower count', () => {
    expect(stampStep(base, 'b', 3, 30, false)).toMatchObject({ text: null, clear: true })
    expect(stampStep(base, 'a', 0, 30, false)).toMatchObject({
      baseline: { game: 'a', seen: 0 },
      clear: true,
    })
  })
})
