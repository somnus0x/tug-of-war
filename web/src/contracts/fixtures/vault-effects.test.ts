import type { ActionParams } from '../tx/actions'
import type { VaultTxName } from '../tx/vault-actions'
import type { SourceScope } from '../types'
import type { ViewerName } from './viewers'
import type { Address } from 'viem'

import { describe, expect, it } from 'vitest'

import { tokenWei } from '@/lib/units'

import { applyEffect } from './effects'
import { VAULT_STEPS } from './vault-effects'
import { vaultWorldOf } from './vault-world'
import { viewerAddress } from './viewers'
import { createFixtureWorld } from './world'

const LAUNCHER: Address = '0x0000000000000000000000000000000000000001'
const COIN = 10n ** 18n

const setup = (viewer: ViewerName) => {
  const world = createFixtureWorld({ nowSeconds: () => 1_800_000_000 })
  const vaults = vaultWorldOf(world)
  const scope: SourceScope = { fixture: 'launched', viewer }
  const account = viewerAddress(viewer)
  if (account === undefined) throw new Error('viewer needs a wallet')
  const context = { launcher: LAUNCHER, account, scope }
  const step = <Name extends VaultTxName>(name: Name, params: ActionParams[Name]) => {
    const input = { vaults, context, params }
    const entry = VAULT_STEPS[name]
    return { gate: entry.gate(input), apply: () => entry.apply(input) }
  }
  return {
    world,
    vaults,
    scope,
    account,
    step,
    staker: () => vaults.staker(context),
    pools: () => vaults.vault(LAUNCHER, scope).teamStaked,
  }
}

describe('vault mock effects', () => {
  it('moves claimed coins into the wallet balance', () => {
    const fan = setup('fan-blue')
    expect(fan.staker().tokenBalance).toBe(0n)
    const state = fan.world.simulatorState(LAUNCHER, fan.account, fan.scope)
    const player = fan.world.player(LAUNCHER, fan.account, fan.scope).player
    const result = applyEffect({
      action: 'claim',
      params: {},
      state,
      player,
      overlay: fan.world.overlay(LAUNCHER, fan.scope),
    })
    fan.world.commit(LAUNCHER, fan.scope, result.overlay)
    expect(fan.staker().tokenBalance).toBe(player.claimable)
    expect(fan.staker().tokenBalance).toBeGreaterThan(0n)
  })

  it('needs the allowance before a stake, then moves the balance into the pool', () => {
    const holder = setup('holder-blue')
    const amount = tokenWei(1000n * COIN)
    const balance = holder.staker().tokenBalance
    const poolBefore = holder.pools().blue
    expect(holder.step('stake', { amount, team: 'blue' }).gate).toEqual({
      ok: false,
      reason: 'TransferFailed',
    })
    expect(holder.step('approve', { spender: LAUNCHER, amount }).apply()).toEqual({ amount })
    expect(holder.staker().allowance).toBe(amount)
    const stake = holder.step('stake', { amount, team: 'blue' })
    expect(stake.gate).toEqual({ ok: true })
    expect(stake.apply()).toEqual({ team: 'blue', amount })
    expect(holder.staker()).toMatchObject({
      team: 'blue',
      staked: amount,
      tokenBalance: balance - amount,
      allowance: 0n,
    })
    expect(holder.pools().blue).toBe(poolBefore + amount)
  })

  it('refuses the wrong team, zero and more than the stake', () => {
    const staker = setup('staker-rewards')
    const one = tokenWei(COIN)
    expect(staker.step('stake', { amount: one, team: 'blue' }).gate).toEqual({
      ok: false,
      reason: 'WrongTeam',
    })
    expect(staker.step('stake', { amount: tokenWei(0n), team: 'red' }).gate).toEqual({
      ok: false,
      reason: 'ZeroAmount',
    })
    const tooMuch = tokenWei(staker.staker().staked + 1n)
    expect(staker.step('unstake', { amount: tooMuch }).gate).toEqual({
      ok: false,
      reason: 'InsufficientStake',
    })
  })

  it('unstakes back into the wallet and keeps the team', () => {
    const staker = setup('staker-quiet')
    const before = staker.staker()
    const poolBefore = staker.pools().blue
    const unstake = staker.step('unstake', { amount: before.staked })
    expect(unstake.gate).toEqual({ ok: true })
    expect(unstake.apply()).toEqual({ team: 'blue', amount: before.staked })
    expect(staker.staker()).toMatchObject({
      team: 'blue',
      staked: 0n,
      tokenBalance: before.tokenBalance + before.staked,
    })
    expect(staker.pools().blue).toBe(poolBefore - before.staked)
  })

  it('zeroes pending rewards on a claim and refuses a second one', () => {
    const staker = setup('staker-rewards')
    const pending = staker.staker().pendingRewards
    expect(pending).toBeGreaterThan(0n)
    expect(staker.step('claimRewards', {}).apply()).toEqual({ amount: pending })
    expect(staker.staker().pendingRewards).toBe(0n)
    expect(staker.step('claimRewards', {}).gate).toEqual({ ok: false, reason: 'NothingToClaim' })
  })

  it('lets only a captain claim the captain share, once', () => {
    expect(setup('fan-blue').step('claimVaultCaptain', {}).gate).toEqual({
      ok: false,
      reason: 'NotCaptain',
    })
    const captain = setup('captain-blue')
    expect(captain.step('claimVaultCaptain', {}).gate).toEqual({ ok: true })
    captain.step('claimVaultCaptain', {}).apply()
    expect(captain.step('claimVaultCaptain', {}).gate).toEqual({
      ok: false,
      reason: 'NothingToClaim',
    })
  })
})
