import type { WalletRead } from './wallet-read'
import type { ViewerName } from '@/contracts/fixtures/viewers'
import type { Player, SourceScope } from '@/contracts/types'
import type { Staker } from '@/contracts/vault-types'
import type { Address } from 'viem'

import { describe, expect, it } from 'vitest'

import { FIXTURE_RULES } from '@/contracts/fixtures/constants'
import { vaultWorldOf } from '@/contracts/fixtures/vault-world'
import { viewerAddress } from '@/contracts/fixtures/viewers'
import { createFixtureWorld } from '@/contracts/fixtures/world'
import { VAULT_COPY } from '@/copy/vault'

import { poolsOf } from './pools-text'
import {
  keepTeamLine,
  rewardsOf,
  stakeLabelOf,
  stakeLockOf,
  viewerKindOf,
  yourCoinsOf,
} from './vault-cards'
import { walletReadOf } from './wallet-read'

const LAUNCHER: Address = '0x0000000000000000000000000000000000000001'

const viewOf = (viewer: ViewerName, fixture = 'launched') => {
  const world = createFixtureWorld({ nowSeconds: () => 1_800_000_000 })
  const vaults = vaultWorldOf(world)
  const scope: SourceScope = { fixture, viewer }
  const account = viewerAddress(viewer)
  const { game } = world.game(LAUNCHER, scope)
  const player = account === undefined ? undefined : world.player(LAUNCHER, account, scope).player
  const staker =
    account === undefined ? undefined : vaults.staker({ launcher: LAUNCHER, account, scope })
  return {
    game,
    player: walletReadOf<Player>(account, player, false),
    staker: walletReadOf<Staker>(account, staker, false),
    vault: vaults.vault(LAUNCHER, scope),
  }
}

const ready = <T>(read: WalletRead<T>): T => {
  if (read.kind !== 'ready') throw new Error('expected a read')
  return read.value
}

const ME: Address = '0x0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c'

describe('wallet reads', () => {
  it('tells loading and failed apart from a visitor and from real zeroes', () => {
    expect(walletReadOf(undefined, 1, false)).toEqual({ kind: 'visitor' })
    expect(walletReadOf(ME, undefined, false)).toEqual({ kind: 'loading' })
    expect(walletReadOf(ME, undefined, true)).toEqual({ kind: 'failed' })
    expect(walletReadOf(ME, 0, true)).toEqual({ kind: 'ready', value: 0 })
  })

  it('shows reading and failed text instead of visitor text or zero BNB', () => {
    const { game } = viewOf('fan-blue')
    expect(yourCoinsOf({ game, player: { kind: 'loading' }, canClaim: true })).toEqual({
      kind: 'loading',
    })
    expect(yourCoinsOf({ game, player: { kind: 'failed' }, canClaim: true })).toEqual({
      kind: 'failed',
    })
    expect(rewardsOf({ kind: 'loading' }, FIXTURE_RULES)).toEqual({
      pending: null,
      line: VAULT_COPY.wallet.reading,
      claimLabel: null,
    })
    expect(rewardsOf({ kind: 'failed' }, FIXTURE_RULES).line).toBe(VAULT_COPY.wallet.failed)
    expect(rewardsOf({ kind: 'visitor' }, FIXTURE_RULES).pending).toBeNull()
    expect(viewerKindOf({ kind: 'loading' }, { kind: 'loading' })).toBe('unknown')
    expect(viewerKindOf({ kind: 'failed' }, { kind: 'loading' })).toBe('unknown')
  })
})

describe('vault cards for each viewer', () => {
  it('shows a visitor read-only cards', () => {
    const view = viewOf('visitor')
    expect(viewerKindOf(view.player, view.staker)).toBe('visitor')
    expect(yourCoinsOf({ game: view.game, player: view.player, canClaim: null })).toEqual({
      kind: 'visitor',
    })
  })

  it('tells a connected wallet with nothing that it holds no coin', () => {
    const view = viewOf('fan-new')
    expect(viewerKindOf(view.player, view.staker)).toBe('empty')
    expect(yourCoinsOf({ game: view.game, player: view.player, canClaim: false }).kind).toBe(
      'didNotPull',
    )
  })

  it('offers the claim only when the gate says yes', () => {
    const view = viewOf('fan-blue')
    const coins = yourCoinsOf({ game: view.game, player: view.player, canClaim: true })
    expect(viewerKindOf(view.player, view.staker)).toBe('holder')
    if (coins.kind !== 'entitled') throw new Error('expected coins')
    expect(coins.team).toBe('blue')
    expect(coins.rows.map((row) => row.label)).toEqual(['Base coins', 'Bonus coins', 'Total'])
    expect(coins.rows[0]).toMatchObject({ note: 'for 0.25 of 5.00 BNB', value: '17,500 ROPE' })
    expect(coins.claimLabel).toMatch(/^Claim [\d,]+ ROPE$/)
    for (const canClaim of [false, null]) {
      const shown = yourCoinsOf({ game: view.game, player: view.player, canClaim })
      expect(shown.kind === 'entitled' && shown.claimLabel).toBeNull()
    }
  })

  it('locks a claimed player to the team it pulled for, with nothing staked yet', () => {
    const view = viewOf('holder-blue')
    const staker = ready(view.staker)
    const player = ready(view.player)
    const coins = yourCoinsOf({ game: view.game, player: view.player, canClaim: false })
    expect(coins.kind === 'entitled' && coins.claimedLine).toMatch(/^Claimed\. [\d,]+ ROPE/)
    expect(staker.staked).toBe(0n)
    expect(staker.tokenBalance).toBe(player.claimed)
    expect(stakeLockOf(staker.team, player.team)).toEqual({ kind: 'locked', team: 'blue' })
    expect(stakeLabelOf('blue', true)).toBe('Stake on Blue')
  })

  it('lets a holder that never pulled pick a side', () => {
    const view = viewOf('holder-free')
    const staker = ready(view.staker)
    expect(stakeLockOf(staker.team, ready(view.player).team)).toEqual({ kind: 'free' })
    expect(staker.tokenBalance).toBe(2400n * 10n ** 18n)
    expect(stakeLabelOf(null, true)).toBe('Pick a side')
  })

  it('shows claimable rewards with the tax line', () => {
    expect(rewardsOf(viewOf('staker-rewards').staker, FIXTURE_RULES)).toEqual({
      pending: '0.0381 BNB',
      line: 'Your share of the 3% buy and 5% sell tax.',
      claimLabel: 'Claim 0.0381 BNB',
    })
  })

  it('says rewards build up when a staker has none yet', () => {
    const view = viewOf('staker-quiet')
    expect(ready(view.staker).staked).toBeGreaterThan(0n)
    const rewards = rewardsOf(view.staker, FIXTURE_RULES)
    expect(rewards.line).toBe(VAULT_COPY.rewards.empty)
    expect(rewards.pending).toBe('0.00 BNB')
    expect(rewards.claimLabel).toBeNull()
  })

  it('tells a wallet that unstaked everything it keeps its team', () => {
    const staker = ready(viewOf('holder-blue').staker)
    const lock = stakeLockOf(staker.team, 'blue')
    expect(keepTeamLine(staker, lock, true)).toBe('You stay on Blue if you stake again.')
    expect(keepTeamLine(staker, lock, false)).toBeNull()
    expect(keepTeamLine(staker, { kind: 'free' }, true)).toBeNull()
  })

  it('reads mock pools at the real coin supply with a visible rate', () => {
    const view = viewOf('staker-rewards')
    const pools = poolsOf(view.vault, view.game)
    expect(pools.sides.map((side) => side.staked)).toEqual(['41,250 ROPE', '24,600 ROPE'])
    for (const side of pools.sides) {
      expect(side.rate).not.toContain(VAULT_COPY.pools.tiny)
    }
  })
})
