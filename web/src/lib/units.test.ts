import type { BnbWei, PullWei } from './units'

import { describe, expect, expectTypeOf, it } from 'vitest'

import { bnbWei, bps, pullWei, tokenWei } from './units'

describe('units', () => {
  it('brands non-negative values', () => {
    expect(bnbWei(1n)).toBe(1n)
    expect(tokenWei(0n)).toBe(0n)
    expect(pullWei(10n ** 18n)).toBe(10n ** 18n)
    expect(bps(10_000)).toBe(10_000)
  })

  it('rejects values out of range', () => {
    expect(() => bnbWei(-1n)).toThrow(RangeError)
    expect(() => tokenWei(-1n)).toThrow(RangeError)
    expect(() => pullWei(-1n)).toThrow(RangeError)
    expect(() => bps(-1)).toThrow(RangeError)
    expect(() => bps(1.5)).toThrow(RangeError)
    expect(() => bps(65_536)).toThrow(RangeError)
  })

  it('keeps the units apart', () => {
    expectTypeOf<BnbWei>().not.toEqualTypeOf<PullWei>()
    expectTypeOf(bnbWei(1n)).not.toExtend<PullWei>()
  })
})
