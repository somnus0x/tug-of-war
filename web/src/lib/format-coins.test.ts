import { describe, expect, it } from 'vitest'

import { formatCoinsDraft, formatCoinsExact, formatCoinsFull, parseCoins } from './format'
import { tokenWei } from './units'

const COIN = 10n ** 18n

describe('coin amount formatters', () => {
  it('keeps a large round number whole', () => {
    expect(formatCoinsExact(tokenWei(1_000_000n * COIN))).toBe('1000000')
    expect(formatCoinsExact(tokenWei(10n * COIN))).toBe('10')
    expect(formatCoinsExact(tokenWei(0n))).toBe('0')
  })

  it('keeps every decimal in the exact form', () => {
    expect(formatCoinsExact(tokenWei(1n))).toBe('0.000000000000000001')
    expect(parseCoins(formatCoinsExact(tokenWei(123n * COIN + 7n)))).toBe(123n * COIN + 7n)
  })

  it('floors the draft form to four decimals', () => {
    expect(formatCoinsDraft(tokenWei(23_745n * COIN + 975_609_756_097_560_975n))).toBe('23745.9756')
    expect(formatCoinsDraft(tokenWei(5n * COIN))).toBe('5')
    expect(formatCoinsDraft(tokenWei(COIN / 2n))).toBe('0.5')
    expect(formatCoinsDraft(tokenWei(1n))).toBe('0')
  })

  it('groups the full form and keeps its decimals', () => {
    expect(formatCoinsFull(tokenWei(6000n * COIN))).toBe('6,000')
    expect(formatCoinsFull(tokenWei((9n * COIN) / 10n))).toBe('0.9')
    expect(formatCoinsFull(tokenWei(1_234_567n * COIN + COIN / 4n))).toBe('1,234,567.25')
  })
})
