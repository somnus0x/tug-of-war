import { describe, expect, it } from 'vitest'

import { bps } from '@/lib/units'

import { RULES, bnb, gameOf } from './fixture-games'
import { rulesRows } from './rules-rows'

const textOf = (rows: ReturnType<typeof rulesRows>, key: string): string | undefined =>
  rows.find((row) => row.key === key)?.text

describe('rulesRows', () => {
  const config = gameOf('live-mid').config
  const rows = rulesRows(RULES, config)

  it('lists the twelve rules in order', () => {
    expect(rows.map((row) => row.label)).toEqual([
      'One coin',
      'Pool',
      'Base coins',
      'Bonus coins',
      'Early pulls',
      'Team',
      'Cap',
      'Overtime',
      'Minimum raise',
      'Trading tax',
      'Stakers',
      'Captains',
    ])
  })

  it('reads the default values', () => {
    expect(textOf(rows, 'oneCoin')).toBe('Both crews launch one coin together. Supply 1,000,000.')
    expect(textOf(rows, 'pool')).toBe(
      '50% of supply plus all BNB raised goes into the trading pool.',
    )
    expect(textOf(rows, 'bonus')).toBe(
      '13% of supply, split between the teams by the final rope (70 / 30 at most while both teams have pull), then by your pull.',
    )
    expect(textOf(rows, 'early')).toBe(
      'Pull = BNB × weight. 2.00x at the start, 1.00x at the deadline and in overtime.',
    )
    expect(textOf(rows, 'cap')).toBe('Each wallet can put in up to 0.5 BNB.')
    expect(textOf(rows, 'overtime')).toBe(
      'A change of leader in the last 60 seconds adds 30 seconds, up to 5 times. Going level counts.',
    )
    expect(textOf(rows, 'minimum')).toBe(
      'If less than 3 BNB is raised, or the coin is not launched within 24 hours of the clock ending, everyone can take back the BNB they put in.',
    )
    expect(textOf(rows, 'tax')).toBe(
      '3% on buys and 5% on sells for 30 days. 80% goes to the vault, 20% is burned.',
    )
    expect(textOf(rows, 'captains')).toBe(
      'Captains share 2% of supply, vesting over 30 days, and 20% of vault revenue. Both are split by the final rope.',
    )
  })

  it('follows the game config instead of fixed numbers', () => {
    const custom = rulesRows(
      { ...RULES, maxExtensions: 3, overtimeExtension: 20 },
      { ...config, walletCap: bnb('1.25'), maxBonusShareBps: bps(6000), minRaise: bnb('5') },
    )
    expect(textOf(custom, 'cap')).toBe('Each wallet can put in up to 1.25 BNB.')
    expect(textOf(custom, 'bonus')).toContain('(60 / 40 at most')
    expect(textOf(custom, 'overtime')).toContain('adds 20 seconds, up to 3 times')
    expect(textOf(custom, 'minimum')).toContain('less than 5 BNB')
  })

  it('shows config amounts exactly', () => {
    const exact = rulesRows(RULES, {
      ...config,
      minRaise: bnb('3.0009'),
      walletCap: bnb('0.12345'),
    })
    expect(textOf(exact, 'minimum')).toContain('less than 3.0009 BNB')
    expect(textOf(exact, 'cap')).toBe('Each wallet can put in up to 0.12345 BNB.')
  })
})
