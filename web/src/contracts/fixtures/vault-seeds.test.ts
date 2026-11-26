import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { bps } from '@/lib/units'

import { rewardRates } from './vault-seeds'

const COIN = 10n ** 18n
const RULES = { finalBlueShareBps: bps(6000), captainShareBps: bps(2000) }

describe('rewardRates', () => {
  it('splits the staker portion by the final rope and spreads it over the pool', () => {
    const rates = rewardRates({ ...RULES, teamStaked: { blue: 3000n * COIN, red: 1000n * COIN } })
    expect(rates.blue).toBe(parseEther('0.12'))
    expect(rates.red).toBe(parseEther('0.16'))
  })

  it('redirects the other side to a joiner when that side is empty', () => {
    const rates = rewardRates({ ...RULES, teamStaked: { blue: 1000n * COIN, red: 0n } })
    expect(rates.red).toBe(parseEther('0.32'))
    expect(rates.blue).toBe(parseEther('0.4'))
  })

  it('does not divide by zero when both pools are empty', () => {
    const rates = rewardRates({ ...RULES, teamStaked: { blue: 0n, red: 0n } })
    expect(rates).toEqual({ blue: parseEther('0.8'), red: parseEther('0.8') })
  })
})
