import type { SourceScope } from '@/contracts/types'
import type { Address } from 'viem'

import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from '@/contracts/fixtures/constants'
import { applyEffect } from '@/contracts/fixtures/effects'
import { createFixtureLogs } from '@/contracts/fixtures/fixture-logs'
import { createFixtureWorld } from '@/contracts/fixtures/world'
import { fixtureGate } from '@/contracts/tx/fixture-tx'

import { bnb } from './fixture-games'
import { cancelButtonOf, refundedTo } from './waiting-panel'
import { cancelLabelOf } from './waiting-text'

const LAUNCHER: Address = '0x0000000000000000000000000000000000000001'
const LOAD = 1_800_000_000
const FULL = { fromBlock: null, startHint: undefined, createdAt: 0 }

const setup = (fixture: string, viewer: string) => {
  let now = LOAD
  const world = createFixtureWorld({ nowSeconds: () => now })
  const scope: SourceScope = { fixture, viewer }
  return {
    world,
    scope,
    logs: createFixtureLogs(world),
    advance: (seconds: number) => {
      now += seconds
    },
  }
}

const cancel = (context: ReturnType<typeof setup>, account: Address) => {
  const { world, scope } = context
  const state = world.simulatorState(LAUNCHER, account, scope)
  const result = applyEffect({
    action: 'cancel',
    params: {},
    state,
    player: world.player(LAUNCHER, account, scope).player,
    overlay: world.overlay(LAUNCHER, scope),
  })
  world.commit(LAUNCHER, scope, result.overlay)
  return result.outcome
}

const deposit = (context: ReturnType<typeof setup>, account: Address, amount: string) => {
  const { world, scope } = context
  const params = { amount: bnb(amount) }
  const state = world.simulatorState(LAUNCHER, account, scope)
  const gate = fixtureGate('depositCaptain', state, params)
  const player = world.player(LAUNCHER, account, scope, state.now).player
  const result = applyEffect({
    action: 'depositCaptain',
    params,
    state,
    player,
    overlay: world.overlay(LAUNCHER, scope),
  })
  world.commit(LAUNCHER, scope, result.overlay)
  return { gate, outcome: result.outcome }
}

describe('mock captain flow', () => {
  it('starts the game with a running clock when the second captain deposits', () => {
    const context = setup('waiting-blue-in', 'captain-red')
    const red = FIXTURE_ADDRESSES.captainRed
    const { gate, outcome } = deposit(context, red, '0.1')
    expect(gate.ok).toBe(true)
    expect(outcome).toEqual({ team: 'red', amount: bnb('0.1'), started: true })
    const { game } = context.world.game(LAUNCHER, context.scope)
    expect(game.phase).toBe('buyIn')
    expect(game.captainDeposited).toEqual({ blue: true, red: true })
    expect(game.deadline).toBe(LOAD + game.config.duration)
    const read = context.logs.readLogs(LAUNCHER, FULL, context.scope)
    const arrivals = read.logs.filter((log) => log.kind === 'captainDeposited')
    expect(arrivals.map((log) => log.kind === 'captainDeposited' && log.team)).toEqual([
      'blue',
      'red',
    ])
  })

  it('keeps waiting after the first captain deposits', () => {
    const context = setup('waiting-none', 'captain-red')
    const { outcome } = deposit(context, FIXTURE_ADDRESSES.captainRed, '0.2')
    expect(outcome.started).toBe(false)
    expect(context.world.game(LAUNCHER, context.scope).game.phase).toBe('awaitingCaptains')
  })

  it('writes the refund into a Cancelled log when the expired game is cancelled', () => {
    const context = setup('waiting-expired', 'fan-new')
    const { world, scope } = context
    const state = world.simulatorState(LAUNCHER, FIXTURE_ADDRESSES.fanNew, scope)
    expect(fixtureGate('cancel', state, {}).ok).toBe(true)
    const result = applyEffect({
      action: 'cancel',
      params: {},
      state,
      player: world.player(LAUNCHER, FIXTURE_ADDRESSES.fanNew, scope).player,
      overlay: world.overlay(LAUNCHER, scope),
    })
    world.commit(LAUNCHER, scope, result.overlay)
    expect(world.game(LAUNCHER, scope).game.phase).toBe('cancelled')
    const logs = context.logs.readLogs(LAUNCHER, FULL, scope).logs
    expect(refundedTo(logs, FIXTURE_ADDRESSES.captainBlue)).toBe(bnb('0.1'))
    expect(refundedTo(logs, FIXTURE_ADDRESSES.fanNew)).toBeNull()
  })

  it('agrees on the deposit, the cap and the refund after a non-minimum deposit', () => {
    const context = setup('waiting-none', 'captain-red')
    const red = FIXTURE_ADDRESSES.captainRed
    deposit(context, red, '0.2')
    const read = () => context.world.player(LAUNCHER, red, context.scope).player
    expect(read().contribution).toBe(bnb('0.2'))
    expect(read().remainingCap).toBe(bnb('0.3'))
    context.advance(3400)
    const { game } = context.world.game(LAUNCHER, context.scope)
    const button = cancelButtonOf({
      game,
      account: red,
      captain: 'red',
      accept: 'expired',
      cancelGate: { ok: true },
      contribution: read().contribution,
      logs: [],
      isWrongNetwork: false,
      isDepositBusy: false,
    })
    expect(cancelLabelOf(button)).toBe('Cancel and get 0.2 BNB back')
    expect(cancel(context, red)).toEqual({ refunded: bnb('0.2') })
    const logs = context.logs.readLogs(LAUNCHER, FULL, context.scope).logs
    expect(refundedTo(logs, red)).toBe(bnb('0.2'))
  })

  it('reports the cancelled captain the way the contract does', () => {
    const context = setup('waiting-expired', 'captain-blue')
    const blue = FIXTURE_ADDRESSES.captainBlue
    cancel(context, blue)
    const { game } = context.world.game(LAUNCHER, context.scope)
    expect(game.raisedByTeam.blue).toBe(bnb('0.1'))
    expect(game.playersByTeam.blue).toBe(1)
    const player = context.world.player(LAUNCHER, blue, context.scope).player
    expect(player.team).toBe('blue')
    expect(player.contribution).toBe(bnb('0'))
    expect(player.remainingCap).toBe(game.config.walletCap)
  })

  it('serves the Cancelled log for a game that was already cancelled', () => {
    const context = setup('cancelled', 'captain-blue')
    const logs = context.logs.readLogs(LAUNCHER, FULL, context.scope).logs
    expect(refundedTo(logs, FIXTURE_ADDRESSES.captainBlue)).toBe(bnb('0.1'))
  })
})
