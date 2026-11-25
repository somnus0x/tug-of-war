import { describe, expect, it } from 'vitest'

import { formatBnb, shortAddress } from './format'
import { bnbWei } from './units'

const wei = (value: string): ReturnType<typeof bnbWei> => bnbWei(BigInt(value))

describe('formatBnb', () => {
  it('shows two decimals', () => {
    expect(formatBnb(wei('250000000000000000'))).toBe('0.25')
    expect(formatBnb(wei('3000000000000000000'))).toBe('3.00')
    expect(formatBnb(wei('31400000000000000000'))).toBe('31.40')
  })

  it('shows zero with two decimals', () => {
    expect(formatBnb(wei('0'))).toBe('0.00')
  })

  it('shows four decimals below 0.01', () => {
    expect(formatBnb(wei('1240000000000000'))).toBe('0.0012')
    expect(formatBnb(wei('5000000000000000'))).toBe('0.0050')
    expect(formatBnb(wei('9999999999999999'))).toBe('0.0099')
  })

  it('switches back to two decimals at exactly 0.01', () => {
    expect(formatBnb(wei('10000000000000000'))).toBe('0.01')
  })

  it('rounds down', () => {
    expect(formatBnb(wei('259999999999999999'))).toBe('0.25')
    expect(formatBnb(wei('1999999999999999999'))).toBe('1.99')
    expect(formatBnb(wei('12499999999999999'))).toBe('0.01')
    expect(formatBnb(wei('1249999999999999'))).toBe('0.0012')
    expect(formatBnb(wei('1'))).toBe('0.0000')
  })
})

describe('shortAddress', () => {
  it('keeps the first 6 and last 4 characters around an ellipsis', () => {
    expect(shortAddress('0x71C4a0e3f1b2c3d4e5f60718293a4b5c6d7e9e02')).toBe('0x71C4…9e02')
  })
})
