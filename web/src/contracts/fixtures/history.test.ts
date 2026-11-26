import type { GameLog } from '../logs'
import type { SourceScope } from '../types'
import type { FixtureName } from './catalog'
import type { ViewerName } from './viewers'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { bnbWei, mulBps } from '@/lib/units'

import { isPullLog } from '../logs'
import { fixtureGate } from '../tx/fixture-tx'
import { FIXTURE_NAMES } from './catalog'
import { FIXTURE_RULES } from './constants'
import { applyEffect } from './effects'
import { createFixtureLogs } from './fixture-logs'
import { splitUnits } from './history'
import { VIEWERS, viewerAddress } from './viewers'
import { createFixtureWorld } from './world'

const LAUNCHER = '0x0000000000000000000000000000000000000001'
const LOAD = 1_800_000_000

const totalsOf = (logs: readonly GameLog[]) => {
  const totals = {
    blue: { bnb: 0n, pull: 0n, wallets: new Set<string>() },
    red: { bnb: 0n, pull: 0n, wallets: new Set<string>() },
  }
  for (const log of logs) {
    if (!isPullLog(log)) continue
    const side = totals[log.team]
    side.bnb += log.amount
    side.pull +=
      log.kind === 'contributed' ? log.pull : mulBps(log.amount, FIXTURE_RULES.startWeightBps)
    side.wallets.add(log.account.toLowerCase())
  }
  return totals
}

const setup = (fixture: FixtureName, viewer: ViewerName) => {
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

const CASES = FIXTURE_NAMES.flatMap((fixture) =>
  VIEWERS.map((viewer) => [fixture, viewer] as const),
)

const FULL = { fromBlock: null, startHint: undefined, createdAt: 0 }

const ownTotals = (logs: readonly GameLog[], account: string) =>
  logs.reduce(
    (sum, log) =>
      !isPullLog(log) || log.account.toLowerCase() !== account.toLowerCase()
        ? sum
        : {
            bnb: sum.bnb + log.amount,
            pull:
              sum.pull +
              (log.kind === 'contributed'
                ? log.pull
                : mulBps(log.amount, FIXTURE_RULES.startWeightBps)),
          },
    { bnb: 0n, pull: 0n },
  )

const expectAgreement = (context: ReturnType<typeof setup>, viewer: ViewerName) => {
  const { world, scope, logs } = context
  const { game } = world.game(LAUNCHER, scope)
  const read = logs.readLogs(LAUNCHER, FULL, scope)
  const totals = totalsOf(read.logs)
  for (const side of ['blue', 'red'] as const) {
    expect(totals[side].bnb).toBe(game.raisedByTeam[side])
    expect(totals[side].pull).toBe(game.pullByTeam[side])
    expect(totals[side].wallets.size).toBe(game.playersByTeam[side])
    const captain = side === 'blue' ? game.config.captainBlue : game.config.captainRed
    expect(totals[side].wallets.has(captain.toLowerCase())).toBe(game.captainDeposited[side])
  }
  const account = viewerAddress(viewer)
  if (account === undefined || game.phase === 'cancelled') {
    return
  }
  const { player } = world.player(LAUNCHER, account, scope)
  expect(ownTotals(read.logs, account)).toEqual({ bnb: player.contribution, pull: player.pull })
  const onSide =
    player.team === 'none' ? false : totals[player.team].wallets.has(account.toLowerCase())
  expect(onSide).toBe(player.contribution > 0n)
}

describe('fixture history', () => {
  it.each(CASES)('agrees with the team totals and the viewer of %s for %s', (fixture, viewer) => {
    const context = setup(fixture, viewer)
    expectAgreement(context, viewer)
    const read = context.logs.readLogs(LAUNCHER, FULL, context.scope)
    const weights = read.logs.flatMap((log) => (log.kind === 'contributed' ? [log.weightBps] : []))
    expect(weights.every((weight) => weight >= 10_000 && weight <= 20_000)).toBe(true)
  })

  it.each(CASES)('still agrees after a 0.1 BNB pull in %s for %s', (fixture, viewer) => {
    const context = setup(fixture, viewer)
    const { world, scope, advance } = context
    const account = viewerAddress(viewer)
    advance(1)
    const state = world.simulatorState(LAUNCHER, account, scope)
    const player = world.player(LAUNCHER, account, scope).player
    const team = player.team === 'none' ? 'blue' : player.team
    const params = { team, amount: bnbWei(parseEther('0.1')) } as const
    if (fixtureGate('contribute', state, params).ok) {
      const result = applyEffect({
        action: 'contribute',
        params,
        state,
        player,
        overlay: world.overlay(LAUNCHER, scope),
      })
      world.commit(LAUNCHER, scope, result.overlay)
    }
    expect(world.overlay(LAUNCHER, scope).pulls.length).toBeLessThanOrEqual(1)
    expectAgreement(context, viewer)
  })

  it('includes the viewer’s own pull when the fixture has room for it', () => {
    const { world, scope, logs } = setup('live-mid', 'fan-blue')
    const read = logs.readLogs(
      LAUNCHER,
      { fromBlock: null, startHint: undefined, createdAt: 0 },
      scope,
    )
    const own = read.logs.filter(
      (log) => isPullLog(log) && log.account === viewerAddress('fan-blue'),
    )
    const total = own.reduce((sum, log) => sum + (isPullLog(log) ? log.amount : 0n), 0n)
    expect(total).toBe(world.player(LAUNCHER, viewerAddress('fan-blue'), scope).player.contribution)
  })

  it('is the same on every read', () => {
    const a = setup('live-big-crowd', 'visitor')
    const b = setup('live-big-crowd', 'visitor')
    const request = { fromBlock: null, startHint: undefined, createdAt: 0 }
    expect(a.logs.readLogs(LAUNCHER, request, a.scope).logs).toEqual(
      b.logs.readLogs(LAUNCHER, request, b.scope).logs,
    )
  })

  it('gains a log in a new block when a pull is applied', () => {
    const { world, scope, logs, advance } = setup('live-mid', 'fan-new')
    const request = { fromBlock: null, startHint: undefined, createdAt: 0 }
    const before = logs.readLogs(LAUNCHER, request, scope)
    advance(1)
    const account = viewerAddress('fan-new')
    const state = world.simulatorState(LAUNCHER, account, scope)
    const amount = bnbWei(parseEther('0.1'))
    const result = applyEffect({
      action: 'contribute',
      params: { team: 'red', amount },
      state,
      player: world.player(LAUNCHER, account, scope).player,
      overlay: world.overlay(LAUNCHER, scope),
    })
    world.commit(LAUNCHER, scope, result.overlay)
    const after = logs.readLogs(LAUNCHER, { ...request, fromBlock: before.toBlock + 1n }, scope)
    expect(after.logs).toHaveLength(1)
    expect(after.logs[0]?.kind).toBe('contributed')
    expect(after.logs[0]?.blockNumber).toBeGreaterThan(before.toBlock)
    const again = logs.readLogs(LAUNCHER, { ...request, fromBlock: after.toBlock + 1n }, scope)
    expect(again.logs).toHaveLength(0)
  })
})

describe('splitUnits', () => {
  it('splits a total exactly and respects the cap', () => {
    const parts = splitUnits(100n, [1, 1, 8], 40n)
    expect(parts.reduce((sum, part) => sum + part, 0n)).toBe(100n)
    expect(parts.every((part) => part <= 40n)).toBe(true)
  })
})
