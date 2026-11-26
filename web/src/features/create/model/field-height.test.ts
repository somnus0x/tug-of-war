import { describe, expect, it } from 'vitest'

import { fittedHeight } from '../hooks/use-auto-height'

describe('fittedHeight', () => {
  it('grows to the wrapped content and never below the touch target', () => {
    expect(fittedHeight(68.4, 44)).toBe(69)
    expect(fittedHeight(30, 44)).toBe(44)
  })
})
