import { describe, expect, it } from 'vitest'

import { captainReachOf } from './tag-size'

describe('captainReachOf', () => {
  it('stacks the captain tag over the viewer’s own figure', () => {
    expect(captainReachOf('blue', true)).toBe('centre')
    expect(captainReachOf('red', true)).toBe('centre')
  })

  it('points other captain tags outward', () => {
    expect(captainReachOf('blue', false)).toBe('left')
    expect(captainReachOf('red', false)).toBe('right')
  })
})
