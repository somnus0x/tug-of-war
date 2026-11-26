import type { WalletRead } from './wallet-read'
import type { CaptainRead } from '@/contracts/captain-types'
import type { ViewerName } from '@/contracts/fixtures/viewers'
import type { Game } from '@/contracts/types'
import type { Address } from 'viem'

import { describe, expect, it } from 'vitest'

import { readCaptain } from '@/contracts/fixtures/captain-world'
import { vaultWorldOf } from '@/contracts/fixtures/vault-world'
import { viewerAddress } from '@/contracts/fixtures/viewers'
import { createFixtureWorld } from '@/contracts/fixtures/world'
import { VAULT_COPY } from '@/copy/vault'
import { bps, tokenWei } from '@/lib/units'

import { captainCoinsOf, captainShareOf, vestLineOf } from './captain-cards'

const LAUNCHER: Address = '0x0000000000000000000000000000000000000001'
const NOW = 1_800_000_000
const COIN = 10n ** 18n

const viewOf = (viewer: ViewerName) => {
  const world = createFixtureWorld({ nowSeconds: () => NOW })
  const vaults = vaultWorldOf(world)
  const scope = { fixture: 'launched', viewer }
  const account = viewerAddress(viewer)
  const { game } = world.game(LAUNCHER, scope)
  const read: WalletRead<CaptainRead> =
    account === undefined
      ? { kind: 'visitor' }
      : { kind: 'ready', value: readCaptain(vaults, { launcher: LAUNCHER, account, scope }) }
  return { game, read }
}

const withCoins = (read: WalletRead<CaptainRead>, coins: Partial<CaptainRead['coins']>) => {
  if (read.kind !== 'ready') throw new Error('expected a read')
  return {
    kind: 'ready',
    value: { ...read.value, coins: { ...read.value.coins, ...coins } },
  } as const
}

const roped = (game: Game, blue: number): Game => ({ ...game, finalBlueShareBps: bps(blue) })

describe('who sees the captain cards', () => {
  it('hides both from fans, visitors and loading reads', () => {
    for (const viewer of ['fan-blue', 'holder-free', 'visitor'] as const) {
      const { game, read } = viewOf(viewer)
      expect(captainCoinsOf(read, game, NOW)).toBeNull()
      expect(captainShareOf(read, game)).toBeNull()
    }
    const { game } = viewOf('captain-blue')
    expect(captainCoinsOf({ kind: 'loading' }, game, NOW)).toBeNull()
    expect(captainShareOf({ kind: 'failed' }, game)).toBeNull()
  })

  it('shows both to each captain', () => {
    for (const viewer of ['captain-blue', 'captain-red', 'captain-blue-new'] as const) {
      const { game, read } = viewOf(viewer)
      expect(captainCoinsOf(read, game, NOW)).not.toBeNull()
      expect(captainShareOf(read, game)).not.toBeNull()
    }
  })
})

describe('captain coins card', () => {
  it('draws the vested and claimed parts of the bar', () => {
    const { game, read } = viewOf('captain-blue')
    const view = captainCoinsOf(read, game, NOW)
    expect(view?.bar?.vestedBps).toBe(4000)
    expect(view?.bar?.claimedBps).toBeGreaterThan(0)
    expect(view?.bar?.claimedBps).toBeLessThan(4000)
    expect(view?.bar?.label).toMatch(/^[\d,]+ of [\d,]+ ROPE vested, 2,000 claimed$/)
    expect(view?.claimLabel).toMatch(/^Claim [\d,]+ ROPE$/)
    expect(view?.canClaim).toBe(true)
    expect(view?.vestLine).toMatch(/^Fully vested on /)
  })

  it('shows the vesting text, not an error, when nothing is vested', () => {
    const { game, read } = viewOf('captain-blue-new')
    const view = captainCoinsOf(read, game, NOW)
    expect(view?.note).toBe(VAULT_COPY.captain.nothingYet)
    expect(view?.claimLabel).toBeNull()
    expect(view?.canClaim).toBe(false)
    expect(view?.bar?.vestedBps).toBe(0)
  })

  it('keeps the button disabled while the gate says no', () => {
    const { game, read } = viewOf('captain-blue')
    if (read.kind !== 'ready') throw new Error('expected a read')
    const blocked = {
      kind: 'ready',
      value: { ...read.value, coinsGate: { ok: false, reason: 'NotLaunched' } },
    } as const
    const view = captainCoinsOf(blocked, game, NOW)
    expect(view?.claimLabel).not.toBeNull()
    expect(view?.canClaim).toBe(false)
  })

  it('says fully vested once the end has passed, with a full bar', () => {
    const { game, read } = viewOf('captain-red')
    const view = captainCoinsOf(read, game, NOW)
    expect(view?.vestLine).toBe(VAULT_COPY.captain.vestDone)
    expect(view?.bar?.vestedBps).toBe(10_000)
    expect(vestLineOf(0, NOW)).toBeNull()
  })

  it('says plainly when the game gives captains no coins', () => {
    const { game, read } = viewOf('captain-blue')
    const zero = withCoins(read, {
      allocation: tokenWei(0n),
      vested: tokenWei(0n),
      claimed: tokenWei(0n),
      claimable: tokenWei(0n),
    })
    const noCoins = { ...game, config: { ...game.config, captainAllocBps: bps(0) } }
    expect(captainCoinsOf(zero, noCoins, NOW)).toMatchObject({
      note: VAULT_COPY.captain.noAllocation,
      bar: null,
      claimLabel: null,
    })
  })

  it('offers a claim below one whole coin, shown exactly', () => {
    const { game, read } = viewOf('captain-blue-new')
    const dust = withCoins(read, { vested: tokenWei(COIN / 2n), claimable: tokenWei(COIN / 2n) })
    const open = { kind: 'ready', value: { ...dust.value, coinsGate: { ok: true } } } as const
    expect(captainCoinsOf(dust, game, NOW)?.canClaim).toBe(false)
    const view = captainCoinsOf(open, game, NOW)
    expect(view?.claimLabel).toBe('Claim 0.5 ROPE')
    expect(view?.canClaim).toBe(true)
    expect(view?.note).toBeNull()
  })

  it('offers the fractional remainder once fully vested', () => {
    const { game, read } = viewOf('captain-red')
    if (read.kind !== 'ready') throw new Error('expected a read')
    const all = read.value.coins.allocation
    const rest = withCoins(read, {
      vested: all,
      claimed: tokenWei(all - COIN / 4n),
      claimable: tokenWei(COIN / 4n),
    })
    const view = captainCoinsOf(rest, game, NOW)
    expect(view?.claimLabel).toBe('Claim 0.25 ROPE')
    expect(view?.note).toBeNull()
    expect(view?.vestLine).toBe(VAULT_COPY.captain.vestDone)
  })

  it('says why a captain has no coins on a one-sided rope', () => {
    const { game, read } = viewOf('captain-red')
    const zero = withCoins(read, {
      allocation: tokenWei(0n),
      vested: tokenWei(0n),
      claimed: tokenWei(0n),
      claimable: tokenWei(0n),
    })
    expect(captainCoinsOf(zero, roped(game, 10_000), NOW)?.note).toBe(
      VAULT_COPY.captain.noTeamAllocation('Red'),
    )
    const noCoins = { ...game, config: { ...game.config, captainAllocBps: bps(0) } }
    expect(captainCoinsOf(zero, noCoins, NOW)?.note).toBe(VAULT_COPY.captain.noAllocation)
  })
})

describe('captain tax share card', () => {
  it('states each team’s own part of the share', () => {
    const blue = viewOf('captain-blue')
    const red = viewOf('captain-red')
    expect(captainShareOf(blue.read, roped(blue.game, 6000))?.line).toBe(
      'Captains share 20% of vault revenue. Blue’s part is fixed at 60.0% by the final rope.',
    )
    expect(captainShareOf(red.read, roped(red.game, 6000))?.line).toBe(
      'Captains share 20% of vault revenue. Red’s part is fixed at 40.0% by the final rope.',
    )
  })

  it('gives one captain the whole part on a one-sided rope', () => {
    const blue = viewOf('captain-blue')
    const red = viewOf('captain-red')
    expect(captainShareOf(blue.read, roped(blue.game, 10_000))?.line).toContain('100.0%')
    expect(captainShareOf(red.read, roped(red.game, 10_000))?.line).toContain('0.0%')
  })

  it('offers the BNB claim only above zero', () => {
    const blue = viewOf('captain-blue')
    expect(captainShareOf(blue.read, blue.game)).toMatchObject({
      claimLabel: 'Claim 0.0320 BNB',
      note: null,
    })
    const red = viewOf('captain-red')
    expect(captainShareOf(red.read, red.game)).toMatchObject({
      claimLabel: null,
      note: VAULT_COPY.captain.noShareYet,
    })
  })

  it('says a zero share is for good, not still to come', () => {
    const red = viewOf('captain-red')
    expect(captainShareOf(red.read, roped(red.game, 10_000))?.note).toBe(
      VAULT_COPY.captain.noShareTeam('Red'),
    )
    const noShare = { ...red.game, config: { ...red.game.config, captainShareBps: bps(0) } }
    expect(captainShareOf(red.read, noShare)?.note).toBe(VAULT_COPY.captain.noShareGame)
    expect(captainShareOf(red.read, roped(red.game, 6000))?.note).toBe(
      VAULT_COPY.captain.noShareYet,
    )
  })
})
