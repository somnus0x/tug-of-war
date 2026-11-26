import type { ViewerName } from './viewers'
import type { Address } from 'viem'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { CAPTAIN_STEPS, readCaptain, vestedAt } from './captain-world'
import { vaultWorldOf } from './vault-world'
import { viewerAddress } from './viewers'
import { createFixtureWorld } from './world'

const LAUNCHER: Address = '0x0000000000000000000000000000000000000001'
const DAY = 86_400
const START = 1_800_000_000

const setup = (viewer: ViewerName) => {
  let now = START
  const world = createFixtureWorld({ nowSeconds: () => now })
  const vaults = vaultWorldOf(world)
  const account = viewerAddress(viewer)
  if (account === undefined) throw new Error('viewer needs a wallet')
  const context = { launcher: LAUNCHER, account, scope: { fixture: 'launched', viewer } }
  const input = { vaults, context }
  return {
    read: () => readCaptain(vaults, context),
    staker: () => vaults.staker(context),
    advance: (seconds: number) => {
      now += seconds
    },
    claimCoins: CAPTAIN_STEPS.claimCaptain,
    claimShare: CAPTAIN_STEPS.claimVaultCaptain,
    input,
  }
}

describe('vestedAt', () => {
  it('vests linearly and never past the total', () => {
    expect(vestedAt(1000n, 100, 1000, 100)).toBe(0n)
    expect(vestedAt(1000n, 100, 1000, 600)).toBe(500n)
    expect(vestedAt(1000n, 100, 1000, 5000)).toBe(1000n)
  })
})

describe('captain mock world', () => {
  it('gives fans no captain views', () => {
    const fan = setup('fan-blue')
    expect(fan.read().coins.team).toBe('none')
    expect(fan.read().share.team).toBe('none')
    expect(fan.claimCoins.gate(fan.input)).toEqual({ ok: false, reason: 'NotCaptain' })
    expect(fan.claimShare.gate(fan.input)).toEqual({ ok: false, reason: 'NotCaptain' })
  })

  it('has nothing vested at the moment of launch, then vests as time moves', () => {
    const fresh = setup('captain-blue-new')
    expect(fresh.read().coins.vested).toBe(0n)
    expect(fresh.claimCoins.gate(fresh.input)).toEqual({ ok: false, reason: 'NothingToClaim' })
    fresh.advance(DAY)
    expect(fresh.read().coins.vested).toBeGreaterThan(0n)
    expect(fresh.claimCoins.gate(fresh.input)).toEqual({ ok: true })
  })

  it('claims vested coins into the token balance and only touches the coin numbers', () => {
    const blue = setup('captain-blue')
    const before = blue.read()
    const balance = blue.staker().tokenBalance
    expect(before.coins.claimable).toBeGreaterThan(0n)
    expect(blue.claimCoins.apply(blue.input)).toEqual({ amount: before.coins.claimable })
    const after = blue.read()
    expect(after.coins.claimable).toBe(0n)
    expect(after.coins.claimed).toBe(before.coins.claimed + before.coins.claimable)
    expect(after.share).toEqual(before.share)
    expect(blue.staker().tokenBalance).toBe(balance + before.coins.claimable)
  })

  it('claims the tax share in BNB and leaves the coins alone', () => {
    const blue = setup('captain-blue')
    const before = blue.read()
    expect(before.share.claimable).toBe(parseEther('0.032'))
    expect(blue.claimShare.apply(blue.input)).toEqual({ amount: parseEther('0.032') })
    const after = blue.read()
    expect(after.share.claimable).toBe(0n)
    expect(after.coins).toEqual(before.coins)
    expect(blue.claimShare.gate(blue.input)).toEqual({ ok: false, reason: 'NothingToClaim' })
  })

  it('is fully vested for the red captain, with no tax share yet', () => {
    const red = setup('captain-red')
    const read = red.read()
    expect(read.coins.team).toBe('red')
    expect(read.coins.vested).toBe(read.coins.allocation)
    expect(read.coins.vestEnd).toBeLessThan(START)
    expect(read.share.claimable).toBe(0n)
  })
})

const contextOf = (viewer: ViewerName) => {
  const account = viewerAddress(viewer)
  if (account === undefined) throw new Error('viewer needs a wallet')
  return { launcher: LAUNCHER, account, scope: { fixture: 'launched', viewer } }
}

const shared = () => vaultWorldOf(createFixtureWorld({ nowSeconds: () => START }))

describe('captain ledgers across viewers and views', () => {
  it('keeps one viewer’s claims out of another viewer’s moment', () => {
    const vaults = shared()
    const blue = { vaults, context: contextOf('captain-blue') }
    CAPTAIN_STEPS.claimCaptain.apply(blue)
    CAPTAIN_STEPS.claimVaultCaptain.apply(blue)
    const fresh = readCaptain(vaults, contextOf('captain-blue-new'))
    expect(fresh.coins.claimed).toBe(0n)
    expect(fresh.coins.vested).toBe(0n)
    expect(fresh.share.claimed).toBe(0n)
    expect(fresh.share.claimable).toBe(fresh.share.accrued)
    expect(readCaptain(vaults, contextOf('captain-blue')).share.claimable).toBe(0n)
  })

  it('agrees between the vault view and the captain view before and after claims', () => {
    const vaults = shared()
    for (const viewer of ['captain-blue', 'captain-red', 'captain-blue-new'] as const) {
      const context = contextOf(viewer)
      const check = () => {
        const captain = readCaptain(vaults, context)
        const side = captain.share.team === 'red' ? 'red' : 'blue'
        const vault = vaults.vault(LAUNCHER, context.scope)
        expect(vault.captainAccrued[side]).toBe(captain.share.accrued)
        expect(vault.captainClaimed[side]).toBe(captain.share.claimed)
      }
      check()
      if (CAPTAIN_STEPS.claimVaultCaptain.gate({ vaults, context }).ok) {
        CAPTAIN_STEPS.claimVaultCaptain.apply({ vaults, context })
      }
      check()
    }
  })
})
