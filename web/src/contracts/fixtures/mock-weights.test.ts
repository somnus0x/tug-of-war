import { describe, expect, it } from 'vitest'

import { weightBpsAt } from '@/lib/clock'

import { FIXTURE_NAMES } from './catalog'
import { FIXTURE_RULES } from './constants'
import { createFixtureLogs } from './fixture-logs'
import { createFixtureWorld } from './world'

const LAUNCHER = '0x0000000000000000000000000000000000000001'
const FULL = { fromBlock: null, startHint: undefined, createdAt: 0 }
const NOW = 1_800_000_000

const liveGames = FIXTURE_NAMES.filter((name) => {
  const world = createFixtureWorld({ nowSeconds: () => NOW })
  return world.game(LAUNCHER, { fixture: name, viewer: 'fan-new' }).game.phase === 'buyIn'
})

describe('mock pull weights', () => {
  it('covers the live games', () => {
    expect(liveGames.length).toBeGreaterThan(5)
  })

  const cases = liveGames.flatMap((fixture) =>
    ['fan-new', 'fan-blue', 'fan-red'].map((viewer) => [fixture, viewer] as const),
  )

  it.each(cases)(
    'falls with time and never below the weight now in %s for %s',
    (fixture, viewer) => {
      const world = createFixtureWorld({ nowSeconds: () => NOW })
      const scope = { fixture, viewer }
      const { game } = world.game(LAUNCHER, scope)
      const weightNow = weightBpsAt(
        {
          gameStart: game.gameStart,
          originalDeadline: game.originalDeadline,
          startWeightBps: FIXTURE_RULES.startWeightBps,
        },
        NOW,
      )
      const weights = createFixtureLogs(world)
        .readLogs(LAUNCHER, FULL, scope)
        .logs.flatMap((log) => (log.kind === 'contributed' ? [Number(log.weightBps)] : []))
      const falling = weights.every(
        (weight, index) => index === 0 || weight <= (weights[index - 1] ?? 0),
      )
      expect(falling).toBe(true)
      expect(Math.min(...weights)).toBeGreaterThanOrEqual(weightNow)
    },
  )
})
