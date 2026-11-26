import type { Game } from '../types'

import { isAddress } from 'viem'
import { describe, expect, it } from 'vitest'

import { weightBpsAt } from '@/lib/clock'
import { shareBps } from '@/lib/units'

import { buildGame, livePhaseAt } from './builder'
import { DEFAULT_FIXTURE, FIXTURE_NAMES, fixtureInput, resolveFixture } from './catalog'
import { FIXTURE_ADDRESSES, FIXTURE_RULES } from './constants'

const LOAD = 1_800_000_000
const launcher = '0x0000000000000000000000000000000000000001'

const build = (name: (typeof FIXTURE_NAMES)[number], now = LOAD) =>
  buildGame(fixtureInput(name), { launcher, loadTime: LOAD, now })

const expectedPhase = (game: Game, now: number) => {
  if (game.phase === 'awaitingCaptains' || game.phase === 'cancelled') {
    return game.phase
  }
  return livePhaseAt(
    now,
    game.deadline,
    game.raised >= game.config.minRaise,
    FIXTURE_RULES.launchGrace,
    game.phase === 'launched',
  )
}

const REQUIRED = [
  'waiting-none',
  'waiting-blue-in',
  'waiting-expired',
  'live-mid',
  'live-first-pulls',
  'live-min-not-met',
  'live-one-sided',
  'live-tie',
  'live-final-minute',
  'live-overtime-1',
  'live-overtime-last',
  'live-big-crowd',
  'ended-can-launch',
  'ended-auto-launch',
  'ended-floor-blocked',
  'refunding-min-missed',
  'refunding-grace-expired',
  'launched',
  'launched-quiet',
  'cancelled',
]

describe('fixture catalog', () => {
  it('has every named fixture and defaults to the mid-game one', () => {
    expect(FIXTURE_NAMES.toSorted()).toEqual(REQUIRED.toSorted())
    expect(DEFAULT_FIXTURE).toBe('live-mid')
    expect(resolveFixture(undefined)).toBe('live-mid')
    expect(resolveFixture('nope')).toBe('live-mid')
    expect(resolveFixture('live-tie')).toBe('live-tie')
  })

  it('uses valid addresses', () => {
    for (const address of Object.values(FIXTURE_ADDRESSES)) {
      expect(isAddress(address)).toBe(true)
    }
  })
})

describe.each(FIXTURE_NAMES)('fixture %s', (name) => {
  const game = build(name)

  it('sums the team totals', () => {
    expect(game.raised).toBe(game.raisedByTeam.blue + game.raisedByTeam.red)
  })

  it('draws the rope from the pull', () => {
    expect(game.ropeBps).toBe(
      shareBps(game.pullByTeam.blue, game.pullByTeam.blue + game.pullByTeam.red),
    )
  })

  it('keeps pull between one and two times the BNB', () => {
    for (const team of ['blue', 'red'] as const) {
      expect(game.pullByTeam[team] >= game.raisedByTeam[team]).toBe(true)
      expect(game.pullByTeam[team] <= game.raisedByTeam[team] * 2n).toBe(true)
    }
  })

  it('fits every team under the wallet cap', () => {
    for (const team of ['blue', 'red'] as const) {
      const cap = game.config.walletCap * BigInt(game.playersByTeam[team])
      expect(game.raisedByTeam[team] <= cap).toBe(true)
    }
  })

  it('reports a phase that matches its times', () => {
    expect(game.phase).toBe(expectedPhase(game, LOAD))
    expect(build(name, LOAD + 120).phase).toBe(expectedPhase(build(name, LOAD + 120), LOAD + 120))
  })

  it('computes the weight from the clock', () => {
    const started = game.gameStart > 0
    const expected = started
      ? weightBpsAt(
          {
            gameStart: game.gameStart,
            originalDeadline: game.originalDeadline,
            startWeightBps: FIXTURE_RULES.startWeightBps,
          },
          LOAD,
        )
      : FIXTURE_RULES.startWeightBps
    expect(game.currentWeightBps).toBe(expected)
  })
})

const STARTED = FIXTURE_NAMES.filter((name) => build(name).gameStart > 0)

describe.each(STARTED)('started fixture %s', (name) => {
  const game = build(name)

  it('derives the deadlines from the duration and overtime', () => {
    expect(game.currentWeightBps).toBe(
      weightBpsAt(
        {
          gameStart: game.gameStart,
          originalDeadline: game.originalDeadline,
          startWeightBps: FIXTURE_RULES.startWeightBps,
        },
        LOAD,
      ),
    )
    expect(game.originalDeadline - game.gameStart).toBe(game.config.duration)
    expect(game.deadline - game.originalDeadline).toBe(
      game.extensionsUsed * FIXTURE_RULES.overtimeExtension,
    )
  })

  it('has both captains in once buy-in opened', () => {
    expect(game.captainDeposited).toEqual({ blue: true, red: true })
    expect(game.raisedByTeam.blue >= game.config.captainMinDeposit).toBe(true)
    expect(game.raisedByTeam.red >= game.config.captainMinDeposit).toBe(true)
  })
})

describe('fixture phases', () => {
  it('matches the names', () => {
    expect(build('waiting-none').phase).toBe('awaitingCaptains')
    expect(build('live-mid').phase).toBe('buyIn')
    expect(build('ended-can-launch').phase).toBe('awaitingLaunch')
    expect(build('refunding-min-missed').phase).toBe('refunding')
    expect(build('refunding-grace-expired').phase).toBe('refunding')
    expect(build('launched').phase).toBe('launched')
    expect(build('cancelled').phase).toBe('cancelled')
  })

  it('runs the clock relative to the load time', () => {
    const game = build('live-mid')
    expect(game.deadline - LOAD).toBe(84)
    expect(build('live-mid', LOAD + 84).phase).toBe('awaitingLaunch')
    expect(build('live-min-not-met', LOAD + 147).phase).toBe('refunding')
  })

  it('puts the big crowd lead on the smaller side', () => {
    const game = build('live-big-crowd')
    expect(game.playersByTeam).toEqual({ blue: 148, red: 96 })
    expect(game.pullByTeam.red > game.pullByTeam.blue).toBe(true)
  })

  it('takes the one-sided rope beyond the bonus cap', () => {
    expect(build('live-one-sided').ropeBps > FIXTURE_RULES.maxBonusShareBps).toBe(true)
  })

  it('ties exactly', () => {
    const game = build('live-tie')
    expect(game.pullByTeam.blue).toBe(game.pullByTeam.red)
    expect(game.ropeBps).toBe(5000)
  })

  it('fixes the final share after launch within the cap', () => {
    const game = build('launched')
    expect(game.finalBlueShareBps).toBe(game.ropeBps)
    expect(game.token).not.toBe(game.pool)
  })
})
