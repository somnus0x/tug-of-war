import type { WalletRecord } from './fold-logs'

import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from '@/contracts/fixtures/constants'
import { pullWei } from '@/lib/units'

import { bannerViewOf } from './banner-text'
import { endedToneOf } from './ended-view'
import { bnb, gameOf, playerOf } from './fixture-games'
import { isMinMissed, lampsShownOf } from './page-model'
import { pageHeadline } from './page-text'
import { topPullersOf } from './top-pullers'
import { youBoxOf } from './you-box'

const wallet = (
  address: `0x${string}`,
  team: 'blue' | 'red',
  pull: string,
  firstSeen: number,
): WalletRecord => ({
  address,
  team,
  bnb: bnb(pull),
  pull: bnb(pull),
  firstSeen,
  isCaptain: false,
})

describe('bannerViewOf', () => {
  it('uses the plan texts and leaves the wrong network to the header', () => {
    expect(bannerViewOf({ kind: 'wrongNetwork' })).toBeNull()
    expect(bannerViewOf({ kind: 'stale' })).toEqual({
      kind: 'warn',
      text: 'Reconnecting. The rope and clock may be a few seconds behind.',
      retry: true,
    })
    expect(bannerViewOf({ kind: 'lastOvertime' })?.kind).toBe('warn')
    expect(bannerViewOf({ kind: 'tie' })?.text).toBe(
      'Level at 50.0%. In the final minute, moving into or out of a tie also adds 30 seconds.',
    )
    expect(bannerViewOf({ kind: 'capUsedUp', walletCap: bnb('0.5') })?.text).toBe(
      'You have used your 0.50 BNB cap. Your pull keeps counting until the clock ends.',
    )
    expect(bannerViewOf({ kind: 'captain', team: 'blue' })?.text).toBe(
      'You captain Blue. After launch you claim captain coins and Blue’s part of the captain tax share.',
    )
  })
})

describe('topPullersOf', () => {
  const wallets = [
    wallet(FIXTURE_ADDRESSES.fanBlue, 'blue', '0.4', 0),
    wallet(FIXTURE_ADDRESSES.fanNew, 'blue', '0.9', 1),
    wallet(FIXTURE_ADDRESSES.fanCapped, 'blue', '0.6', 2),
    wallet(FIXTURE_ADDRESSES.funder, 'blue', '0.1', 3),
    wallet(FIXTURE_ADDRESSES.fanRed, 'red', '0.7', 4),
  ]

  it('lists the three largest by pull for one team and marks the viewer', () => {
    const top = topPullersOf(wallets, true, 'blue', FIXTURE_ADDRESSES.fanBlue)
    expect(top?.map((row) => row.pull)).toEqual([bnb('0.9'), bnb('0.6'), bnb('0.4')])
    expect(top?.map((row) => row.isViewer)).toEqual([false, false, true])
  })

  it('hides while the fold is incomplete and is empty for a quiet team', () => {
    expect(topPullersOf(wallets, false, 'blue', undefined)).toBeNull()
    expect(topPullersOf([], true, 'red', undefined)).toEqual([])
  })
})

describe('youBoxOf', () => {
  it('shows BNB in, pull and cap left while the game is live', () => {
    const game = gameOf('live-mid')
    expect(youBoxOf(playerOf('fan-blue', game), 'buyIn')).toEqual({
      team: 'blue',
      bnbIn: bnb('0.25'),
      pull: pullWei(bnb('0.37')),
      capLeft: bnb('0.25'),
      showsLock: false,
    })
  })

  it('drops the cap after the clock and hides wallets without a team', () => {
    const game = gameOf('refunding-min-missed')
    expect(youBoxOf(playerOf('fan-blue', game), 'refunding')?.capLeft).toBeNull()
    expect(youBoxOf(playerOf('fan-blue', game), 'refunding')?.showsLock).toBe(true)
    expect(youBoxOf(playerOf('fan-new', game), 'refunding')).toBeNull()
    expect(youBoxOf(null, 'buyIn')).toBeNull()
  })
})

describe('after the clock', () => {
  it('calls the rope final', () => {
    const headline = pageHeadline(gameOf('ended-can-launch'))
    expect(headline.title).toMatch(/^Final: Blue holds \d+\.\d% of the pull$/)
    expect(headline.detail).toMatch(/^Final rope · Blue [\d.]+ pull · Red [\d.]+ pull$/)
  })

  it('keeps the lamps on desktop and marks a missed minimum', () => {
    expect(lampsShownOf('refunding', 'ended', 'desktop')).toBe(true)
    expect(lampsShownOf('refunding', 'ended', 'phone')).toBe(false)
    expect(lampsShownOf('buyIn', 'final', 'phone')).toBe(true)
    expect(lampsShownOf('buyIn', 'running', 'phone')).toBe(false)
    expect(isMinMissed(gameOf('refunding-min-missed'))).toBe(true)
    expect(isMinMissed(gameOf('refunding-grace-expired'))).toBe(false)
  })

  it('colours the outcome by state', () => {
    expect(endedToneOf({ kind: 'launched', raised: bnb('5') })).toBe('go')
    expect(endedToneOf({ kind: 'refunded', amount: null })).toBe('refund')
    expect(
      endedToneOf({ kind: 'floorBlocked', cause: 'belowFloor', graceEnd: 0, graceLeft: 0 }),
    ).toBe('hold')
  })
})
