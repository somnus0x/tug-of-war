import type { ActionParams } from '../tx/actions'
import type { SourceScope } from '../types'
import type { LauncherActionName } from '@/lib/actions'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { bnbWei, mulBps } from '@/lib/units'

import { fixtureGate, fixtureModeFromSearch, plausibleRevert } from '../tx/fixture-tx'
import { FIXTURE_ADDRESSES } from './constants'
import { applyEffect } from './effects'
import { createFixtureWorld } from './world'

const LAUNCHER = '0x0000000000000000000000000000000000000001'
const LOAD = 1_800_000_000

const worldAt = () => {
  let now = LOAD
  const world = createFixtureWorld({ nowSeconds: () => now })
  return {
    world,
    advance: (seconds: number) => {
      now += seconds
    },
  }
}

const scopeOf = (fixture: string, viewer: string): SourceScope => ({ fixture, viewer })

const act = <Name extends LauncherActionName>(
  world: ReturnType<typeof createFixtureWorld>,
  scope: SourceScope,
  account: `0x${string}` | undefined,
  action: Name,
  params: ActionParams[Name],
) => {
  const state = world.simulatorState(LAUNCHER, account, scope)
  const gate = fixtureGate(action, state, params)
  if (!gate.ok) {
    return { gate, outcome: null }
  }
  const player = world.player(LAUNCHER, account, scope, state.now).player
  const result = applyEffect({
    action,
    params,
    state,
    player,
    overlay: world.overlay(LAUNCHER, scope),
  })
  world.commit(LAUNCHER, scope, result.overlay)
  return { gate, outcome: result.outcome }
}

const bnb = (value: string) => bnbWei(parseEther(value))

describe('fixture effects', () => {
  it('adds a pull at the current weight to the team and the viewer', () => {
    const { world } = worldAt()
    const scope = scopeOf('live-mid', 'fan-new')
    const before = world.game(LAUNCHER, scope).game
    const me = FIXTURE_ADDRESSES.fanNew
    const { outcome } = act(world, scope, me, 'contribute', { team: 'blue', amount: bnb('0.1') })
    const after = world.game(LAUNCHER, scope).game
    const pull = mulBps(bnb('0.1'), before.currentWeightBps)
    expect(outcome).toMatchObject({ team: 'blue', pull, weightBps: before.currentWeightBps })
    expect(after.raised).toBe(before.raised + bnb('0.1'))
    expect(after.pullByTeam.blue).toBe(before.pullByTeam.blue + pull)
    expect(after.playersByTeam.blue).toBe(before.playersByTeam.blue + 1)
    expect(after.ropeBps).not.toBe(before.ropeBps)
    const read = world.player(LAUNCHER, me, scope)
    expect(read.player.team).toBe('blue')
    expect(read.player.contribution).toBe(bnb('0.1'))
    expect(read.player.remainingCap).toBe(bnb('0.4'))
    expect(read.balance).toBe(bnb('1.15'))
  })

  it('locks the team after the first pull and counts the wallet once', () => {
    const { world } = worldAt()
    const scope = scopeOf('live-mid', 'fan-new')
    const me = FIXTURE_ADDRESSES.fanNew
    act(world, scope, me, 'contribute', { team: 'blue', amount: bnb('0.1') })
    const players = world.game(LAUNCHER, scope).game.playersByTeam.blue
    act(world, scope, me, 'contribute', { team: 'blue', amount: bnb('0.1') })
    expect(world.game(LAUNCHER, scope).game.playersByTeam.blue).toBe(players)
    const red = act(world, scope, me, 'contribute', { team: 'red', amount: bnb('0.1') })
    expect(red.gate).toEqual({ ok: false, reason: 'TeamLocked' })
  })

  it('extends the clock when a late pull changes the leader', () => {
    const { world } = worldAt()
    const scope = scopeOf('live-final-minute', 'fan-new')
    const before = world.game(LAUNCHER, scope).game
    act(world, scope, FIXTURE_ADDRESSES.fanNew, 'contribute', { team: 'red', amount: bnb('0.1') })
    const after = world.game(LAUNCHER, scope).game
    expect(after.pullByTeam.red > after.pullByTeam.blue).toBe(true)
    expect(after.extensionsUsed).toBe(before.extensionsUsed + 1)
    expect(after.deadline).toBe(before.deadline + 30)
  })

  it('starts the clock on the second captain deposit', () => {
    const { world } = worldAt()
    const scope = scopeOf('waiting-blue-in', 'captain-blue')
    const red = FIXTURE_ADDRESSES.captainRed
    const { outcome } = act(world, scope, red, 'depositCaptain', { amount: bnb('0.1') })
    expect(outcome).toEqual({ team: 'red', amount: bnb('0.1'), started: true })
    const game = world.game(LAUNCHER, scope).game
    expect(game.phase).toBe('buyIn')
    expect(game.gameStart).toBe(LOAD)
    expect(game.deadline).toBe(LOAD + game.config.duration)
  })

  it('cancels, schedules and withdraws', () => {
    const { world } = worldAt()
    const expired = scopeOf('waiting-expired', 'visitor')
    expect(act(world, expired, undefined, 'cancel', {}).outcome).toEqual({ refunded: bnb('0.1') })
    expect(world.game(LAUNCHER, expired).game.phase).toBe('cancelled')

    const live = scopeOf('live-mid', 'funder')
    const funder = FIXTURE_ADDRESSES.funder
    act(world, live, funder, 'scheduleAutoLaunch', {})
    const scheduled = world.game(LAUNCHER, live).game
    expect(scheduled.triggerFunder).toBe(funder)
    expect(act(world, live, funder, 'scheduleAutoLaunch', {}).gate).toEqual({
      ok: false,
      reason: 'AutoLaunchAlreadyScheduled',
    })
  })

  it('launches and then lets the viewer claim', () => {
    const { world } = worldAt()
    const scope = scopeOf('ended-can-launch', 'fan-blue')
    const me = FIXTURE_ADDRESSES.fanBlue
    const { outcome } = act(world, scope, me, 'launch', {})
    expect(outcome).toMatchObject({ token: FIXTURE_ADDRESSES.token })
    const game = world.game(LAUNCHER, scope).game
    expect(game.phase).toBe('launched')
    expect(game.finalBlueShareBps).toBeGreaterThan(0)
    const claim = act(world, scope, me, 'claim', {})
    expect(claim.gate.ok).toBe(true)
    expect(world.player(LAUNCHER, me, scope).player.claimable).toBe(0n)
    expect(act(world, scope, me, 'claim', {}).gate).toEqual({ ok: false, reason: 'NothingToClaim' })
  })

  it('refunds once', () => {
    const { world } = worldAt()
    const scope = scopeOf('refunding-min-missed', 'fan-blue')
    const me = FIXTURE_ADDRESSES.fanBlue
    expect(act(world, scope, me, 'refund', {}).outcome).toEqual({ amount: bnb('0.25') })
    expect(world.player(LAUNCHER, me, scope).player.refundable).toBe(0n)
    expect(act(world, scope, me, 'refund', {}).gate).toEqual({
      ok: false,
      reason: 'NothingToRefund',
    })
  })

  it('keeps overlays apart per fixture', () => {
    const { world } = worldAt()
    act(world, scopeOf('live-mid', 'fan-new'), FIXTURE_ADDRESSES.fanNew, 'contribute', {
      team: 'blue',
      amount: bnb('0.1'),
    })
    const other = scopeOf('live-tie', 'fan-new')
    expect(world.player(LAUNCHER, FIXTURE_ADDRESSES.fanNew, other).player.team).toBe('none')
  })
})

describe('fixture outcome switches', () => {
  it('reads the tx search parameter', () => {
    expect(fixtureModeFromSearch('?fx=live-mid&tx=reject')).toBe('reject')
    expect(fixtureModeFromSearch('?tx=revert')).toBe('revert')
    expect(fixtureModeFromSearch('?tx=slow')).toBe('slow')
    expect(fixtureModeFromSearch('?tx=other')).toBe('normal')
    expect(fixtureModeFromSearch('')).toBe('normal')
  })

  it('reverts with the gate reason, or a plausible error when the gate is open', () => {
    expect(plausibleRevert('contribute', { ok: true })).toBe('BuyInClosed')
    expect(plausibleRevert('contribute', { ok: false, reason: 'TeamLocked' })).toBe('TeamLocked')
    expect(plausibleRevert('launch', { ok: true })).toBe('BelowCreationFloor')
  })
})
