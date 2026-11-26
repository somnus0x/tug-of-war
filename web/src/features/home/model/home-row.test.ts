import type { HomeEntry } from '@/contracts/home-types'

import { describe, expect, it } from 'vitest'

import { buildGame } from '@/contracts/fixtures/builder'
import { fixtureInput } from '@/contracts/fixtures/catalog'
import { HOME_COPY } from '@/copy/home'
import { formatDateTime } from '@/lib/format'
import { bps, pullWei } from '@/lib/units'

import {
  createdAtOf,
  homeLinkOf,
  homeRowOf,
  phaseKindOf,
  ropeLabelOf,
  ropeMarkerPercent,
  rowLabelOf,
} from './home-row'

const LOAD = 1_800_000_000
const LAUNCHER = '0x0000000000000000000000000000000000000001'

const gameOf = (name: Parameters<typeof fixtureInput>[0], at = 0) =>
  buildGame(fixtureInput(name), { launcher: LAUNCHER, loadTime: LOAD, now: LOAD + at })

describe('homeRowOf', () => {
  it.each([
    ['waiting-none', 'Waiting for captains'],
    ['live-mid', 'Live'],
    ['ended-can-launch', 'Clock ended'],
    ['refunding-min-missed', 'Refunding'],
    ['launched', 'Launched'],
    ['cancelled', 'Cancelled'],
  ] as const)('labels %s as %s', (name, label) => {
    expect(homeRowOf(gameOf(name), LOAD).phaseLabel).toBe(label)
  })

  it('shows the countdown only while live', () => {
    const live = homeRowOf(gameOf('live-mid'), LOAD)
    expect(live.countdown).toBe(HOME_COPY.timeLeft('1:24'))
    expect(live.clock).toBe('1:24')
    expect(homeRowOf(gameOf('waiting-none'), LOAD).countdown).toBeNull()
    expect(homeRowOf(gameOf('waiting-none'), LOAD).clock).toBeNull()
    expect(homeRowOf(gameOf('live-mid'), null).countdown).toBeNull()
  })

  it.each([
    ['waiting-none', HOME_COPY.clockNone],
    ['ended-can-launch', HOME_COPY.clockOver],
    ['refunding-min-missed', HOME_COPY.clockOver],
    ['launched', HOME_COPY.clockOver],
    ['cancelled', HOME_COPY.clockNone],
  ] as const)('fills the time column for %s with %s', (name, note) => {
    const row = homeRowOf(gameOf(name), LOAD)
    expect(row.clock).toBeNull()
    expect(row.clockNote).toBe(note)
  })

  it('fills the time column with a dash while the chain time is unknown', () => {
    expect(homeRowOf(gameOf('live-mid'), null).clockNote).toBe(HOME_COPY.clockNone)
  })

  it('reads the creation time back from the captain deadline', () => {
    const game = gameOf('live-mid')
    const at = game.acceptDeadline - game.config.acceptWindow
    expect(createdAtOf(game)).toBe(at)
    expect(homeRowOf(game, LOAD).created).toBe(HOME_COPY.created(formatDateTime(at)))
    expect(rowLabelOf(homeRowOf(game, LOAD))).toContain(HOME_COPY.created(formatDateTime(at)))
  })

  it('leaves the creation time out when the captain deadline is missing', () => {
    const game = { ...gameOf('live-mid'), acceptDeadline: 0 }
    expect(createdAtOf(game)).toBeNull()
    expect(homeRowOf(game, LOAD).created).toBeNull()
  })

  it('calls a live game whose clock has run out clock ended', () => {
    const game = gameOf('live-mid')
    expect(phaseKindOf(game, game.deadline + 1)).toBe('ended')
    expect(phaseKindOf(game, game.deadline - 1)).toBe('live')
  })

  it('calls a game whose clock ran out below the minimum raise refunding, as the contract does', () => {
    const game = gameOf('live-min-not-met')
    expect(game.raised < game.config.minRaise).toBe(true)
    expect(phaseKindOf(game, game.deadline)).toBe('refunding')
    expect(phaseKindOf(game, game.deadline - 1)).toBe('live')
    expect(homeRowOf(game, game.deadline + 5).phaseLabel).toBe(HOME_COPY.phase.refunding)
  })

  it('fills the row from the game', () => {
    const game = gameOf('live-mid')
    const row = homeRowOf(game, LOAD)
    expect(row.name).toBe(game.config.name)
    expect(row.symbol).toBe(game.config.symbol)
    expect(row.raised).toBe('3.95 BNB raised')
    expect(row.raisedAmount).toBe('3.95 BNB')
    expect(row.captainBlue).toBe(
      `${game.config.captainBlue.slice(0, 6)}…${game.config.captainBlue.slice(-4)}`,
    )
    expect(homeRowOf(game, LOAD, game.config.captainRed).captainRed).toBe('You')
    expect(row.ropeLabel).toMatch(/^(Blue|Red) holds \d+\.\d% of the pull$/)
  })
})

describe('idle rope', () => {
  it('keeps the marker centred until the game starts or when cancelled', () => {
    for (const name of ['waiting-blue-in', 'cancelled'] as const) {
      const game = gameOf(name)
      expect(game.ropeBps).not.toBe(5000)
      const row = homeRowOf(game, LOAD)
      expect(row.ropeBps).toBe(5000)
      expect(row.ropeLabel).toBe(HOME_COPY.ropeIdle)
    }
  })

  it('describes the pull once the game is live', () => {
    const game = gameOf('live-mid')
    expect(homeRowOf(game, LOAD).ropeBps).toBe(game.ropeBps)
  })
})

const withPull = (blue: bigint, red: bigint, ropeBps: number) => ({
  ...gameOf('live-mid'),
  pullByTeam: { blue: pullWei(blue), red: pullWei(red) },
  ropeBps: bps(ropeBps),
})

describe('ropeLabelOf', () => {
  it('calls equal pull level, as the game page does', () => {
    expect(ropeLabelOf(withPull(10n ** 18n, 10n ** 18n, 5000))).toBe('Level at 50.0%')
  })

  it('names the leader on a one-wei lead even when the rope rounds to the middle', () => {
    expect(ropeLabelOf(withPull(10n ** 18n + 1n, 10n ** 18n, 5000))).toBe(
      'Blue holds 50.0% of the pull',
    )
    expect(ropeLabelOf(withPull(10n ** 18n, 10n ** 18n + 1n, 5000))).toBe(
      'Red holds 50.0% of the pull',
    )
    expect(ropeLabelOf(withPull(1n, 3n, 2500))).toBe('Red holds 75.0% of the pull')
  })
})

describe('homeLinkOf', () => {
  const entry: HomeEntry = { key: 'live-mid:3', launcher: LAUNCHER, fixture: 'live-mid' }

  it('carries the row’s own fixture and the viewer in mock mode', () => {
    expect(homeLinkOf(entry, 'fan-blue', true)).toEqual({
      launcher: LAUNCHER,
      search: { fx: 'live-mid', as: 'fan-blue' },
    })
  })

  it('links straight to the launcher on chain', () => {
    expect(homeLinkOf({ ...entry, fixture: undefined }, undefined, false)).toEqual({
      launcher: LAUNCHER,
      search: {},
    })
  })
})

describe('ropeMarkerPercent', () => {
  it('moves toward Blue when Blue leads', () => {
    expect(ropeMarkerPercent(5000)).toBe(50)
    expect(ropeMarkerPercent(10_000)).toBe(0)
    expect(ropeMarkerPercent(0)).toBe(100)
    expect(ropeMarkerPercent(7000)).toBe(30)
  })
})

describe('rowLabelOf', () => {
  it('reads out everything the row shows', () => {
    const row = homeRowOf(gameOf('live-mid'), LOAD)
    const label = rowLabelOf(row)
    for (const part of [row.name, row.symbol, row.phaseLabel, row.captainBlue, row.captainRed]) {
      expect(label).toContain(part)
    }
    expect(label).toContain(row.ropeLabel)
    expect(label).toContain(row.raised)
    expect(label).toContain(HOME_COPY.timeLeft('1:24'))
    expect(label.endsWith('Open the game.')).toBe(true)
  })

  it('leaves out the clock when there is none and keeps one full stop per sentence', () => {
    const label = rowLabelOf(homeRowOf(gameOf('waiting-none'), LOAD))
    expect(label).toContain(HOME_COPY.ropeIdle)
    expect(label).not.toContain('..')
    expect(label).not.toContain('left.')
  })
})
