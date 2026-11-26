import type { HomeEntry, HomeListing, HomeSource } from '../home-types'
import type { GameSource } from '../types'
import type { FixtureName } from './catalog'
import type { Address } from 'viem'

import { newestFirst } from '../home-window'
import { FIXTURE_ADDRESSES } from './constants'

export const MOCK_LAUNCHER: Address = '0x0000000000000000000000000000000000000001'

export const BROKEN_ROW = 'row-broken'

const OLDEST_FIRST: readonly FixtureName[] = [
  'launched-quiet',
  'refunding-grace-expired',
  'launched',
  'cancelled',
  'refunding-min-missed',
  'ended-can-launch',
  'live-big-crowd',
  'live-final-minute',
  'live-mid',
  'waiting-blue-in',
  'waiting-none',
]

const CAPTAIN_GAMES: readonly FixtureName[] = ['live-mid', 'waiting-blue-in']

export const HOME_FIXTURES = ['empty', 'many', 'row-fails', 'unreadable'] as const

const entryOf = (fixture: string, index: number): HomeEntry => ({
  key: `${fixture}:${String(index)}`,
  launcher: MOCK_LAUNCHER,
  fixture,
})

export const mockListing = (fixture: string | undefined): HomeListing => {
  if (fixture === 'empty') {
    return { count: 0, entries: [] }
  }
  const names: readonly string[] =
    fixture === 'many'
      ? [...OLDEST_FIRST, ...OLDEST_FIRST, ...OLDEST_FIRST]
      : fixture === 'row-fails'
        ? [...OLDEST_FIRST.slice(0, 8), BROKEN_ROW, ...OLDEST_FIRST.slice(8)]
        : OLDEST_FIRST
  const all = names.map(entryOf)
  return { count: all.length, entries: newestFirst(all) }
}

const isCaptain = (account: Address): boolean =>
  [FIXTURE_ADDRESSES.captainBlue, FIXTURE_ADDRESSES.captainRed].some(
    (captain) => captain.toLowerCase() === account.toLowerCase(),
  )

export const createFixtureHomeSource = (games: GameSource): HomeSource => ({
  readRecent: (scope) =>
    scope.fixture === 'unreadable'
      ? Promise.reject(new Error('The factory cannot be read'))
      : Promise.resolve(mockListing(scope.fixture)),
  readCaptainGames: (account) =>
    Promise.resolve(
      isCaptain(account) ? CAPTAIN_GAMES.map((name, index) => entryOf(name, -1 - index)) : [],
    ),
  readRow: (entry, scope) =>
    entry.fixture === BROKEN_ROW
      ? Promise.reject(new Error('This game cannot be read'))
      : games.readGame(entry.launcher, { fixture: entry.fixture, viewer: scope.viewer }),
})
