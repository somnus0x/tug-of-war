import type { BannerInput } from './banners'
import type { LogBatch } from '@/contracts/logs'

import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from '@/contracts/fixtures/constants'
import { mergeLogBatch } from '@/contracts/logs'

import { gameBannerOf } from './banner-text'
import { deriveLive } from './derive-live'
import { LOAD, RULES, accountOf, bnb, gameOf, playerOf } from './fixture-games'
import { deriveRoles } from './roles'
import { isFoldComplete, pullerNameOf } from './top-pullers'

const batch = (from: bigint, to: bigint, caughtUp: boolean): LogBatch => ({
  logs: [],
  fromBlock: from,
  toBlock: to,
  caughtUp,
  hasMore: !caughtUp,
  times: {},
})

describe('isFoldComplete', () => {
  it('hides the rankings again while a resumed tab is still catching up', () => {
    const first = mergeLogBatch(undefined, batch(0n, 100n, true))
    expect(isFoldComplete(first)).toBe(true)
    const resumed = mergeLogBatch(first, batch(101n, 200n, false))
    expect(resumed.backfilled).toBe(true)
    expect(isFoldComplete(resumed)).toBe(false)
    expect(isFoldComplete(mergeLogBatch(resumed, batch(201n, 300n, true)))).toBe(true)
    expect(isFoldComplete(undefined)).toBe(false)
  })
})

const bannerInput = (
  name: Parameters<typeof gameOf>[0],
  viewer: Parameters<typeof accountOf>[0],
) => {
  const game = gameOf(name)
  const input: BannerInput = {
    walletStatus: 'connected',
    stale: false,
    live: deriveLive(game, RULES, LOAD),
    player: playerOf(viewer, game),
    roles: deriveRoles(game, accountOf(viewer)),
    game,
  }
  return input
}

describe('gameBannerOf', () => {
  it('leaves the wrong network to the header and shows nothing else', () => {
    const input = bannerInput('live-mid', 'captain-blue')
    expect(gameBannerOf({ ...input, isClosing: false })?.text).toMatch(/^You captain Blue/)
    expect(gameBannerOf({ ...input, walletStatus: 'wrongNetwork', isClosing: false })).toBeNull()
  })

  it('drops live banners while the clock closes but keeps the connection warning', () => {
    const capped = bannerInput('live-mid', 'fan-capped')
    expect(gameBannerOf({ ...capped, isClosing: false })?.text).toMatch(/^You have used/)
    expect(gameBannerOf({ ...capped, isClosing: true })).toBeNull()
    expect(gameBannerOf({ ...capped, stale: true, isClosing: true })?.retry).toBe(true)
  })
})

describe('pullerNameOf', () => {
  it('reads You for the viewer and a short address otherwise', () => {
    const puller = { address: FIXTURE_ADDRESSES.fanBlue, pull: bnb('0.5'), isViewer: false }
    expect(pullerNameOf({ ...puller, isViewer: true })).toBe('You')
    expect(pullerNameOf(puller)).toMatch(/^0x71c4…/)
  })
})
