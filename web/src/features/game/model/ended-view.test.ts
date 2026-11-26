import type { EndedPanel } from './ended-panel'

import { describe, expect, it } from 'vitest'

import { formatShare } from '@/lib/format'
import { bps } from '@/lib/units'

import { endedViewOf, poolCoinsOf, splitLineOf } from './ended-view'
import { RULES, bnb, gameOf } from './fixture-games'

const ENDED = gameOf('ended-can-launch')

const view = (panel: EndedPanel, isLaunching = false) =>
  endedViewOf(panel, ENDED, RULES, isLaunching)

const refundAvailable = (reason: 'minMissed' | 'graceExpired'): EndedPanel => ({
  kind: 'refundAvailable',
  reason,
  refundable: bnb('0.25'),
  raised: bnb('2.1'),
  minRaise: bnb('3'),
  launchGrace: RULES.launchGrace,
})

describe('endedViewOf', () => {
  it('lets anyone launch with the leader line', () => {
    expect(view({ kind: 'canLaunch', lead: 'blue', leaderShareBps: ENDED.ropeBps })).toEqual({
      title: 'Time is up',
      body: `Blue holds ${formatShare(ENDED.ropeBps)} of the pull. Anyone can launch the coin now.`,
      action: { kind: 'launch' },
    })
  })

  it('keeps the launch button while auto-launch is on its way', () => {
    const panel: EndedPanel = {
      kind: 'autoLaunchScheduled',
      lead: 'tie',
      leaderShareBps: ENDED.ropeBps,
    }
    expect(view(panel)).toEqual({
      title: 'Time is up',
      body: 'Auto-launch is scheduled. Anyone can also launch now.',
      action: { kind: 'launch' },
    })
  })

  it('describes the launch while it runs', () => {
    const panel: EndedPanel = { kind: 'canLaunch', lead: 'blue', leaderShareBps: ENDED.ropeBps }
    expect(view(panel, true)).toEqual({
      title: 'Launching',
      body: 'Creating the coin and seeding the pool with 5.00 BNB.',
      action: { kind: 'launch' },
    })
  })

  it('maps each hold cause to its text with no button', () => {
    const below = view({ kind: 'floorBlocked', cause: 'belowFloor', graceEnd: 0, graceLeft: 10 })
    expect(below?.title).toBe('Launch is on hold')
    expect(below?.body).toMatch(
      /^The raise is below Flap’s liquidity floor right now\. If that does not change by .+, everyone can take back the BNB they put in\.$/,
    )
    expect(below?.action).toBeNull()
    const unread = view({
      kind: 'floorBlocked',
      cause: 'floorUnreadable',
      graceEnd: 0,
      graceLeft: 10,
    })
    expect(unread).toEqual({
      title: 'Launch is on hold',
      body: 'Flap’s Portal cannot be read right now. Checking again every few seconds.',
      action: null,
    })
  })

  it('names the coin and the pool after launch and links to the vault', () => {
    expect(view({ kind: 'launched', raised: bnb('5') })).toEqual({
      title: 'Rope Coin is live',
      body: `The pool holds 5.00 BNB and ${poolCoinsOf(RULES)} ROPE. Claim your coins next.`,
      action: { kind: 'vault' },
    })
    expect(poolCoinsOf(RULES)).toBe('500,000')
  })

  it('offers the refund for a missed minimum and for a missed launch', () => {
    expect(view(refundAvailable('minMissed'))).toEqual({
      title: 'Minimum raise missed',
      body: 'Raised 2.10 of 3.00 BNB. The coin does not launch and everyone gets the BNB they put in back.',
      action: { kind: 'refund', amount: bnb('0.25') },
    })
    expect(view(refundAvailable('graceExpired'))).toEqual({
      title: 'Not launched in time',
      body: 'The coin was not launched within 24 hours of the clock ending. Everyone gets the BNB they put in back.',
      action: { kind: 'refund', amount: bnb('0.25') },
    })
  })

  it('shows an updating line with no button while the read catches up', () => {
    expect(view({ kind: 'updating', reason: 'minMissed' })).toEqual({
      title: 'Minimum raise missed',
      body: 'Updating this wallet’s refund…',
      action: null,
    })
  })

  it('confirms a refund with or without the amount from the event', () => {
    expect(view({ kind: 'refunded', amount: bnb('0.3') })?.body).toBe(
      '0.30 BNB is back in your wallet.',
    )
    expect(view({ kind: 'refunded', amount: null })?.body).toBe(
      'The BNB you put in is back in your wallet.',
    )
  })

  it('tells a wallet that did not pull, and asks a visitor to connect', () => {
    const base = {
      kind: 'nothingToRefund',
      reason: 'minMissed',
      raised: bnb('2.1'),
      minRaise: bnb('3'),
    } as const
    expect(view({ ...base, connected: true })).toEqual({
      title: 'Minimum raise missed',
      body: 'Raised 2.10 of 3.00 BNB. The coin does not launch. This wallet did not pull, so there is nothing to refund.',
      action: null,
    })
    expect(view({ ...base, connected: false })?.action).toEqual({ kind: 'connect' })
  })
})

describe('splitLineOf', () => {
  it('shows the final split only after launch', () => {
    const launched = gameOf('launched')
    const blue = launched.finalBlueShareBps
    expect(splitLineOf(launched)).toBe(
      `Bonus and captain split: Blue ${formatShare(blue)} · Red ${formatShare(bps(10_000 - blue))}`,
    )
    expect(splitLineOf(ENDED)).toBeNull()
  })
})
