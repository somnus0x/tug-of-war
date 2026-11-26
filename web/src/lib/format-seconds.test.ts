import { describe, expect, it } from 'vitest'

import { formatSecondsShort } from './format'

describe('formatSecondsShort', () => {
  it('writes whole seconds with a short unit', () => {
    expect(formatSecondsShort(30)).toBe('30s')
    expect(formatSecondsShort(90.7)).toBe('90s')
    expect(formatSecondsShort(-4)).toBe('0s')
  })
})
