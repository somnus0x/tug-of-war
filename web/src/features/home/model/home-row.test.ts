import type { HomeEntry } from '@/contracts/home-types'

import { describe, expect, it } from 'vitest'

import { buildGame } from '@/contracts/fixtures/builder'
import { fixtureInput } from '@/contracts/fixtures/catalog'
import { HOME_COPY } from '@/copy/home'

import { homeLinkOf, homeRowOf, phaseKindOf, ropeMarkerPercent } from './home-row'

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
    expect(homeRowOf(gameOf('waiting-none'), LOAD).countdown).toBeNull()
    expect(homeRowOf(gameOf('live-mid'), null).countdown).toBeNull()
  })

  it('calls a live game whose clock has run out clock ended', () => {
    const game = gameOf('live-mid')
    expect(phaseKindOf(game, game.deadline + 1)).toBe('ended')
    expect(phaseKindOf(game, game.deadline - 1)).toBe('live')
  })

  it('fills the row from the game', () => {
    const game = gameOf('live-mid')
    const row = homeRowOf(game, LOAD)
    expect(row.name).toBe(game.config.name)
    expect(row.symbol).toBe(game.config.symbol)
    expect(row.raised).toBe('3.95 BNB raised')
    expect(row.captainBlue).toBe(
      `${game.config.captainBlue.slice(0, 6)}…${game.config.captainBlue.slice(-4)}`,
    )
    expect(homeRowOf(game, LOAD, game.config.captainRed).captainRed).toBe('You')
    expect(row.ropeLabel).toMatch(/^Blue holds \d+\.\d% of the pull$/)
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
