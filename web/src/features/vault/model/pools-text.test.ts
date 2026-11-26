import type { Vault } from '@/contracts/vault-types'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { buildGame } from '@/contracts/fixtures/builder'
import { fixtureInput } from '@/contracts/fixtures/catalog'
import { VAULT_COPY } from '@/copy/vault'
import { bnbWei, bps, tokenWei } from '@/lib/units'

import { poolsOf, rateText } from './pools-text'

const COIN = 10n ** 18n

const game = {
  ...buildGame(fixtureInput('launched'), {
    launcher: '0x0000000000000000000000000000000000000001',
    loadTime: 1_800_000_000,
    now: 1_800_000_000,
  }),
  finalBlueShareBps: bps(6000),
}

const vaultOf = (blue: bigint, red: bigint): Vault => ({
  teamStaked: { blue: tokenWei(blue * COIN), red: tokenWei(red * COIN) },
  rewardPer1000NewTokensPerBnb: {
    blue: bnbWei(parseEther('0.0115')),
    red: bnbWei(parseEther('0.8')),
  },
  captainAccrued: { blue: bnbWei(0n), red: bnbWei(0n) },
  captainClaimed: { blue: bnbWei(0n), red: bnbWei(0n) },
  undistributed: bnbWei(0n),
})

describe('pool split line', () => {
  it('splits by the final rope when both pools hold coins', () => {
    expect(poolsOf(vaultOf(41_250n, 18_600n), game).split).toBe(
      'The stakers’ part of the tax is split between the pools by the final rope, Blue 60.0% · Red 40.0%.',
    )
  })

  it('sends it all to the other pool when one is empty', () => {
    const pools = poolsOf(vaultOf(41_250n, 0n), game)
    expect(pools.split).toBe(
      'No one is staked on Red, so the stakers’ part of the tax all goes to the Blue pool for now.',
    )
    expect(pools.sides.map((side) => side.isEmpty)).toEqual([false, true])
    expect(pools.sides[1]?.rate).toBe(
      '1,000 coins staked now would earn 0.80 BNB from each 1 BNB the vault receives.',
    )
  })

  it('holds it when both pools are empty', () => {
    expect(poolsOf(vaultOf(0n, 0n), game).split).toBe(VAULT_COPY.pools.splitNone)
  })

  it('shows the coins staked per side', () => {
    expect(poolsOf(vaultOf(41_250n, 18_600n), game).sides.map((side) => side.staked)).toEqual([
      '41,250 ROPE',
      '18,600 ROPE',
    ])
  })
})

describe('rateText', () => {
  it('never shows a positive rate as zero', () => {
    expect(rateText(bnbWei(parseEther('0.00001')))).toBe(VAULT_COPY.pools.tiny)
    expect(rateText(bnbWei(0n))).toBe('0.00')
    expect(rateText(bnbWei(parseEther('0.0115')))).toBe('0.01')
  })
})
