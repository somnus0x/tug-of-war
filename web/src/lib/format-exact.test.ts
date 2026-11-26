import { describe, expect, it } from 'vitest'

import { formatBnbExact, formatSeconds, formatSharePoints } from './format'
import { bnbWei, bps } from './units'

const wei = (value: string): ReturnType<typeof bnbWei> => bnbWei(BigInt(value))

describe('formatBnbExact', () => {
  it('shows a config amount exactly, without trailing zeros', () => {
    expect(formatBnbExact(wei('3000000000000000000'))).toBe('3')
    expect(formatBnbExact(wei('3000900000000000000'))).toBe('3.0009')
    expect(formatBnbExact(wei('500000000000000000'))).toBe('0.5')
    expect(formatBnbExact(wei('1'))).toBe('0.000000000000000001')
    expect(formatBnbExact(wei('0'))).toBe('0')
    expect(formatBnbExact(wei('10000000000000000000'))).toBe('10')
  })
})

describe('formatSharePoints', () => {
  it('drops the percent sign and trailing zeros', () => {
    expect(formatSharePoints(bps(7000))).toBe('70')
    expect(formatSharePoints(bps(3000))).toBe('30')
    expect(formatSharePoints(bps(6250))).toBe('62.5')
  })
})

describe('formatSeconds', () => {
  it('always counts in seconds', () => {
    expect(formatSeconds(60)).toBe('60 seconds')
    expect(formatSeconds(1)).toBe('1 second')
    expect(formatSeconds(-4)).toBe('0 seconds')
  })
})
