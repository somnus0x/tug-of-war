import type { BnbWei, PullWei } from './units'

import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  bnbWei,
  bps,
  bpsToRatio,
  HALF_BPS,
  mulBps,
  pullWei,
  ratioToBps,
  shareBps,
  tokenWei,
} from './units'

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

describe('bps ratios', () => {
  it('turns bps into a bigint ratio and back', () => {
    expect(bpsToRatio(bps(5320))).toEqual({ numerator: 5320n, denominator: 10_000n })
    expect(ratioToBps({ numerator: 1n, denominator: 3n })).toBe(3333)
    expect(ratioToBps({ numerator: 2n, denominator: 3n })).toBe(6666)
    expect(ratioToBps(bpsToRatio(bps(7000)))).toBe(7000)
  })

  it('rejects ratios that are not bps', () => {
    expect(() => ratioToBps({ numerator: 1n, denominator: 0n })).toThrow(RangeError)
    expect(() => ratioToBps({ numerator: -1n, denominator: 2n })).toThrow(RangeError)
    expect(() => ratioToBps({ numerator: 7n, denominator: 1n })).toThrow(RangeError)
  })
})

describe('mulBps', () => {
  it('multiplies by bps and rounds down', () => {
    expect(mulBps(10n ** 18n, bps(20_000))).toBe(2n * 10n ** 18n)
    expect(mulBps(10n ** 18n, bps(14_667))).toBe(1_466_700_000_000_000_000n)
    expect(mulBps(3n, bps(3333))).toBe(0n)
    expect(mulBps(19_999n, bps(5000))).toBe(9_999n)
    expect(mulBps(0n, bps(5000))).toBe(0n)
  })
})

describe('shareBps', () => {
  it('gives the share of the whole in bps, rounded down', () => {
    expect(shareBps(1n, 3n)).toBe(3333)
    expect(shareBps(2n, 3n)).toBe(6666)
    expect(shareBps(532n, 1000n)).toBe(5320)
    expect(shareBps(0n, 5n)).toBe(0)
    expect(shareBps(5n, 5n)).toBe(10_000)
  })

  it('splits evenly when both are zero', () => {
    expect(shareBps(0n, 0n)).toBe(HALF_BPS)
    expect(HALF_BPS).toBe(5000)
  })

  it('rejects a part outside the whole', () => {
    expect(() => shareBps(2n, 1n)).toThrow(RangeError)
    expect(() => shareBps(-1n, 1n)).toThrow(RangeError)
  })
})
