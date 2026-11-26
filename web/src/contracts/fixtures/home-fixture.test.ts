import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from './constants'
import { createFixtureSource } from './fixture-source'
import { BROKEN_ROW, MOCK_LAUNCHER, createFixtureHomeSource, mockListing } from './home-fixture'

const source = createFixtureHomeSource(createFixtureSource())
const scope = (fixture?: string) => ({ fixture, viewer: undefined })

describe('mock home source', () => {
  it('lists mock games newest first, each with its own fixture', async () => {
    const listing = await source.readRecent(scope())
    expect(listing.count).toBe(listing.entries.length)
    expect(listing.entries[0]?.fixture).toBe('waiting-none')
    expect(listing.entries.at(-1)?.fixture).toBe('launched-quiet')
    expect(new Set(listing.entries.map((entry) => entry.key)).size).toBe(listing.entries.length)
    expect(listing.entries.every((entry) => entry.launcher === MOCK_LAUNCHER)).toBe(true)
  })

  it('has an empty variant and keeps only the newest twenty', () => {
    expect(mockListing('empty')).toEqual({ count: 0, entries: [] })
    const many = mockListing('many')
    expect(many.count).toBeGreaterThan(20)
    expect(many.entries).toHaveLength(20)
  })

  it('reads a row through the game source, in that row’s phase', async () => {
    const listing = await source.readRecent(scope())
    const phases = await Promise.all(
      listing.entries.map(async (entry) => (await source.readRow(entry, scope())).game.phase),
    )
    expect(new Set(phases).size).toBeGreaterThanOrEqual(5)
  })

  it('fails one row without failing the list', async () => {
    const listing = await source.readRecent(scope('row-fails'))
    const results = await Promise.allSettled(
      listing.entries.map((entry) => source.readRow(entry, scope('row-fails'))),
    )
    const failed = listing.entries.filter((_entry, index) => results[index]?.status === 'rejected')
    expect(failed.map((entry) => entry.fixture)).toEqual([BROKEN_ROW])
    await expect(source.readRecent(scope('unreadable'))).rejects.toThrow(
      'The factory cannot be read',
    )
  })

  it('lists games for a captain only', async () => {
    await expect(
      source.readCaptainGames(FIXTURE_ADDRESSES.captainBlue, scope()),
    ).resolves.toHaveLength(2)
    await expect(source.readCaptainGames(FIXTURE_ADDRESSES.fanNew, scope())).resolves.toEqual([])
  })
})
