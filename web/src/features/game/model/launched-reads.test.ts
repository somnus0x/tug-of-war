import type { AskedDraft } from '@/contracts/queries/freshness'

import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from '@/contracts/fixtures/constants'
import { isFreshAnswer, nextAsked } from '@/contracts/queries/freshness'

import { gameOf, okGate, playerOf } from './fixture-games'
import { launchedClaimFromReads } from './launched-claim'

const GAME = gameOf('launched')
const ME = FIXTURE_ADDRESSES.fanBlue
const OTHER = FIXTURE_ADDRESSES.fanRed

const PLAYER = { data: playerOf('fan-blue', GAME), isSuccess: true, isFetchedAfterMount: true }

const claimAfter = (asked: AskedDraft, answeredAt: number) =>
  launchedClaimFromReads({
    account: ME,
    player: PLAYER,
    gates: {
      account: asked.account,
      claim: okGate,
      isFresh: isFreshAnswer(answeredAt, asked.askedAt),
    },
  })

describe('claim row from the gate and player reads', () => {
  it('stays claimable after the debounce settles on the same question', () => {
    const mounted: AskedDraft = { account: ME, draft: null, askedAt: 1000 }
    expect(claimAfter(mounted, 1100)).toBe('claim')
    const settled = nextAsked(mounted, ME, null, 1250)
    expect(settled.askedAt).toBe(1000)
    expect(claimAfter(settled, 1100)).toBe('claim')
  })

  it('asks again for another wallet and ignores the old answer until it refreshes', () => {
    const mounted: AskedDraft = { account: OTHER, draft: null, askedAt: 1000 }
    const switched = nextAsked(mounted, ME, null, 2000)
    expect(switched).toEqual({ account: ME, draft: null, askedAt: 2000 })
    expect(claimAfter(mounted, 1100)).toBe('checking')
    expect(claimAfter(switched, 1100)).toBe('checking')
    expect(claimAfter(switched, 2100)).toBe('claim')
  })

  it('keeps the neutral row while the player read is not current', () => {
    const asked: AskedDraft = { account: ME, draft: null, askedAt: 1000 }
    expect(
      launchedClaimFromReads({
        account: ME,
        player: { ...PLAYER, isFetchedAfterMount: false },
        gates: { account: ME, claim: okGate, isFresh: isFreshAnswer(1100, asked.askedAt) },
      }),
    ).toBe('unknown')
  })
})
