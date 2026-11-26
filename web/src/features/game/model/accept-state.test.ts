import { describe, expect, it } from 'vitest'

import { acceptStateOf } from './accept-state'

describe('acceptStateOf', () => {
  it('is unknown until the chain clock is known', () => {
    expect(acceptStateOf(1000, null)).toBe('unknown')
  })

  it('is open before the deadline and expired from it on', () => {
    expect(acceptStateOf(1000, 999)).toBe('open')
    expect(acceptStateOf(1000, 1000)).toBe('expired')
    expect(acceptStateOf(1000, 1500)).toBe('expired')
  })
})
