import { describe, expect, it } from 'vitest'

import {
  formatAgo,
  formatBnb,
  formatBnbStep,
  formatClock,
  formatCoins,
  formatCount,
  formatPull,
  formatShare,
  formatShareExact,
  formatSpan,
  formatWeight,
  parseBnb,
  shortAddress,
  formatDateTime,
} from './format'
import { bnbWei, bps, pullWei, tokenWei } from './units'

const wei = (value: string): ReturnType<typeof bnbWei> => bnbWei(BigInt(value))
const pull = (value: string): ReturnType<typeof pullWei> => pullWei(BigInt(value))

describe('formatBnbStep', () => {
  it('shows up to three decimals without trailing zeros', () => {
    expect(formatBnbStep(wei('125000000000000000'))).toBe('0.125')
    expect(formatBnbStep(wei('250000000000000000'))).toBe('0.25')
    expect(formatBnbStep(wei('500000000000000000'))).toBe('0.5')
    expect(formatBnbStep(wei('1000000000000000000'))).toBe('1')
    expect(formatBnbStep(wei('1234500000000000000'))).toBe('1.234')
  })
})

describe('formatBnb', () => {
  it('shows two decimals', () => {
    expect(formatBnb(wei('250000000000000000'))).toBe('0.25')
    expect(formatBnb(wei('3000000000000000000'))).toBe('3.00')
    expect(formatBnb(wei('31400000000000000000'))).toBe('31.40')
  })

  it('shows zero with two decimals', () => {
    expect(formatBnb(wei('0'))).toBe('0.00')
    expect(formatBnb(wei('0'), { precise: true })).toBe('0.00')
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
    expect(formatBnb(wei('999999999999999999'))).toBe('0.99')
    expect(formatBnb(wei('12499999999999999'))).toBe('0.01')
    expect(formatBnb(wei('1249999999999999'))).toBe('0.0012')
    expect(formatBnb(wei('1'))).toBe('0.0000')
  })

  it('shows four decimals below 1 when precise', () => {
    expect(formatBnb(wei('124000000000000000'), { precise: true })).toBe('0.1240')
    expect(formatBnb(wei('999999999999999999'), { precise: true })).toBe('0.9999')
    expect(formatBnb(wei('1'), { precise: true })).toBe('0.0000')
    expect(formatBnb(wei('1000000000000000000'), { precise: true })).toBe('1.00')
    expect(formatBnb(wei('1259900000000000000'), { precise: true })).toBe('1.25')
  })
})

describe('formatPull', () => {
  it('shows two decimals rounded to nearest, half up', () => {
    expect(formatPull(pull('370000000000000000'))).toBe('0.37')
    expect(formatPull(pull('374999999999999999'))).toBe('0.37')
    expect(formatPull(pull('375000000000000000'))).toBe('0.38')
    expect(formatPull(pull('999999999999999999'))).toBe('1.00')
    expect(formatPull(pull('4999999999999999'))).toBe('0.00')
    expect(formatPull(pull('5000000000000000'))).toBe('0.01')
    expect(formatPull(pull('0'))).toBe('0.00')
    expect(formatPull(pull('1'))).toBe('0.00')
  })
})

describe('formatShareExact', () => {
  it('shows the exact share without trailing zeros', () => {
    expect(formatShareExact(bps(7000))).toBe('70%')
    expect(formatShareExact(bps(6250))).toBe('62.5%')
    expect(formatShareExact(bps(6667))).toBe('66.67%')
    expect(formatShareExact(bps(6005))).toBe('60.05%')
    expect(formatShareExact(bps(0))).toBe('0%')
    expect(formatShareExact(bps(10_000))).toBe('100%')
  })
})

describe('formatShare', () => {
  it('shows one decimal with a percent sign', () => {
    expect(formatShare(bps(5320))).toBe('53.2%')
    expect(formatShare(bps(5000))).toBe('50.0%')
    expect(formatShare(bps(0))).toBe('0.0%')
    expect(formatShare(bps(10_000))).toBe('100.0%')
  })

  it('rounds half up', () => {
    expect(formatShare(bps(5324))).toBe('53.2%')
    expect(formatShare(bps(5325))).toBe('53.3%')
  })

  it('takes the number of decimals', () => {
    expect(formatShare(bps(7000), 0)).toBe('70%')
    expect(formatShare(bps(6950), 0)).toBe('70%')
    expect(formatShare(bps(6949), 0)).toBe('69%')
    expect(formatShare(bps(5321), 2)).toBe('53.21%')
  })
})

describe('formatWeight', () => {
  it('shows two decimals with an x', () => {
    expect(formatWeight(bps(14_667))).toBe('1.47x')
    expect(formatWeight(bps(20_000))).toBe('2.00x')
    expect(formatWeight(bps(10_000))).toBe('1.00x')
    expect(formatWeight(bps(14_649))).toBe('1.46x')
    expect(formatWeight(bps(14_650))).toBe('1.47x')
  })
})

describe('formatCoins', () => {
  it('shows whole coins with grouping, rounded down', () => {
    expect(formatCoins(tokenWei(50_765n * 10n ** 18n), 18)).toBe('50,765')
    expect(formatCoins(tokenWei(50_766n * 10n ** 18n - 1n), 18)).toBe('50,765')
    expect(formatCoins(tokenWei(1_000_000_000n * 10n ** 18n), 18)).toBe('1,000,000,000')
    expect(formatCoins(tokenWei(999n), 3)).toBe('0')
    expect(formatCoins(tokenWei(0n), 18)).toBe('0')
    expect(formatCoins(tokenWei(1234n), 0)).toBe('1,234')
  })
})

describe('formatClock', () => {
  it('shows minutes unpadded and seconds padded', () => {
    expect(formatClock(84)).toBe('1:24')
    expect(formatClock(7)).toBe('0:07')
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(59)).toBe('0:59')
    expect(formatClock(60)).toBe('1:00')
    expect(formatClock(3599)).toBe('59:59')
  })

  it('adds hours from 3600', () => {
    expect(formatClock(3600)).toBe('1:00:00')
    expect(formatClock(7510)).toBe('2:05:10')
  })

  it('clamps negative input and drops fractions', () => {
    expect(formatClock(-5)).toBe('0:00')
    expect(formatClock(Number.NaN)).toBe('0:00')
    expect(formatClock(59.9)).toBe('0:59')
  })
})

describe('formatSpan', () => {
  it('uses the largest whole unit', () => {
    expect(formatSpan(30)).toBe('30 seconds')
    expect(formatSpan(180)).toBe('3 minutes')
    expect(formatSpan(86_400)).toBe('24 hours')
    expect(formatSpan(2_592_000)).toBe('30 days')
    expect(formatSpan(7200)).toBe('2 hours')
  })

  it('keeps an exact smaller unit when the larger one is not whole', () => {
    expect(formatSpan(90)).toBe('90 seconds')
    expect(formatSpan(5400)).toBe('90 minutes')
    expect(formatSpan(129_600)).toBe('36 hours')
  })

  it('uses singular forms', () => {
    expect(formatSpan(1)).toBe('1 second')
    expect(formatSpan(60)).toBe('1 minute')
    expect(formatSpan(3600)).toBe('1 hour')
    expect(formatSpan(0)).toBe('0 seconds')
  })
})

describe('formatAgo', () => {
  it('shows now below 3 seconds', () => {
    expect(formatAgo(0)).toBe('now')
    expect(formatAgo(2.9)).toBe('now')
    expect(formatAgo(-4)).toBe('now')
  })

  it('shows the largest unit, rounded down', () => {
    expect(formatAgo(3)).toBe('3s')
    expect(formatAgo(12)).toBe('12s')
    expect(formatAgo(59)).toBe('59s')
    expect(formatAgo(60)).toBe('1m')
    expect(formatAgo(299)).toBe('4m')
    expect(formatAgo(7200)).toBe('2h')
    expect(formatAgo(86_399)).toBe('23h')
    expect(formatAgo(3 * 86_400)).toBe('3d')
  })
})

describe('shortAddress', () => {
  const address = '0x71C4a0e3f1b2c3d4e5f60718293a4b5c6d7e9e02'

  it('keeps the first 6 and last 4 characters around an ellipsis', () => {
    expect(shortAddress(address)).toBe('0x71C4…9e02')
  })

  it('shows You for the connected wallet in any case', () => {
    expect(shortAddress(address, address.toLowerCase())).toBe('You')
    expect(shortAddress(address.toLowerCase(), '0x71C4A0E3F1B2C3D4E5F60718293A4B5C6D7E9E02')).toBe(
      'You',
    )
  })

  it('shows the short form for another wallet', () => {
    expect(shortAddress(address, '0x0000000000000000000000000000000000000001')).toBe('0x71C4…9e02')
  })
})

describe('parseBnb', () => {
  it('reads decimal BNB into wei', () => {
    expect(parseBnb('0.25')).toBe(250_000_000_000_000_000n)
    expect(parseBnb('.5')).toBe(500_000_000_000_000_000n)
    expect(parseBnb('1')).toBe(1_000_000_000_000_000_000n)
    expect(parseBnb('1.')).toBe(1_000_000_000_000_000_000n)
    expect(parseBnb('  2.5 ')).toBe(2_500_000_000_000_000_000n)
    expect(parseBnb('0')).toBe(0n)
    expect(parseBnb('0.000000000000000001')).toBe(1n)
    expect(parseBnb('0.999999999999999999')).toBe(999_999_999_999_999_999n)
  })

  it('rejects anything else', () => {
    expect(parseBnb('')).toBeNull()
    expect(parseBnb('   ')).toBeNull()
    expect(parseBnb('.')).toBeNull()
    expect(parseBnb('-1')).toBeNull()
    expect(parseBnb('1e3')).toBeNull()
    expect(parseBnb('abc')).toBeNull()
    expect(parseBnb('1.2.3')).toBeNull()
    expect(parseBnb('1,5')).toBeNull()
    expect(parseBnb('1,000')).toBeNull()
    expect(parseBnb('0.0000000000000000001')).toBeNull()
    expect(parseBnb('+1')).toBeNull()
  })

  it('round-trips through formatBnb', () => {
    const parsed = parseBnb('0.25')
    expect(parsed === null ? null : formatBnb(parsed)).toBe('0.25')
  })
})

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(7)).toBe('7')
    expect(formatCount(148)).toBe('148')
    expect(formatCount(12_480)).toBe('12,480')
  })

  it('shows zero for negative or fractional input', () => {
    expect(formatCount(-1)).toBe('0')
    expect(formatCount(1.5)).toBe('0')
  })
})

describe('formatDateTime', () => {
  it('shows day, month and 24-hour time', () => {
    expect(formatDateTime(1_800_000_000, 'UTC')).toBe('15 Jan, 08:00')
  })
})
