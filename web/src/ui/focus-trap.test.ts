import { describe, expect, it } from 'vitest'

import { trapMove } from './focus-trap'

describe('trapMove', () => {
  it('does nothing without focusable items', () => {
    expect(trapMove(0, -1, false)).toBe('none')
  })

  it('wraps forward from the last item to the first', () => {
    expect(trapMove(3, 2, false)).toBe('first')
    expect(trapMove(3, 1, false)).toBe('none')
  })

  it('wraps backward from the first item to the last', () => {
    expect(trapMove(3, 0, true)).toBe('last')
    expect(trapMove(3, 2, true)).toBe('none')
  })

  it('pulls focus in when it sits outside the items', () => {
    expect(trapMove(3, -1, false)).toBe('first')
    expect(trapMove(3, -1, true)).toBe('last')
  })
})
