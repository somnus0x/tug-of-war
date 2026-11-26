import type { BannerInput } from './banners'
import type { FixtureName } from '@/contracts/fixtures/catalog'
import type { ViewerName } from '@/contracts/fixtures/viewers'

import { describe, expect, it } from 'vitest'

import { pickBanner } from './banners'
import { deriveLive } from './derive-live'
import { LOAD, RULES, accountOf, bnb, gameOf, playerOf } from './fixture-games'
import { deriveRoles } from './roles'

const inputOf = (name: FixtureName, viewer: ViewerName = 'fan-new'): BannerInput => {
  const game = gameOf(name)
  return {
    walletStatus: viewer === 'visitor' ? 'disconnected' : 'connected',
    stale: false,
    live: game.phase === 'buyIn' ? deriveLive(game, RULES, LOAD) : null,
    player: viewer === 'visitor' ? null : playerOf(viewer, game),
    roles: deriveRoles(game, accountOf(viewer)),
    game,
  }
}

const kindOf = (input: BannerInput) => pickBanner(input)?.kind ?? null

describe('pickBanner kinds', () => {
  it('shows nothing in a calm game', () => {
    expect(pickBanner(inputOf('live-mid'))).toBeNull()
  })

  it('shows wrong network on any screen', () => {
    expect(kindOf({ ...inputOf('launched'), walletStatus: 'wrongNetwork' })).toBe('wrongNetwork')
  })

  it('shows stale data on any screen', () => {
    expect(kindOf({ ...inputOf('waiting-none'), stale: true })).toBe('stale')
  })

  it('shows the last overtime', () => {
    expect(kindOf(inputOf('live-overtime-last'))).toBe('lastOvertime')
  })

  it('shows the final minute', () => {
    expect(kindOf(inputOf('live-final-minute'))).toBe('finalMinute')
  })

  it('shows a tie', () => {
    expect(kindOf(inputOf('live-tie'))).toBe('tie')
  })

  it('shows the cap used up with the wallet cap', () => {
    const input = inputOf('live-mid', 'fan-capped')
    expect(pickBanner(input)).toEqual({ kind: 'capUsedUp', walletCap: input.game.config.walletCap })
  })

  it('shows the captain their team', () => {
    expect(pickBanner(inputOf('live-mid', 'captain-blue'))).toEqual({
      kind: 'captain',
      team: 'blue',
    })
  })

  it('keeps live banners off the other screens', () => {
    expect(pickBanner(inputOf('ended-can-launch', 'captain-blue'))).toBeNull()
  })
})

describe('pickBanner priority', () => {
  it('puts wrong network above stale data', () => {
    const input = { ...inputOf('live-mid'), walletStatus: 'wrongNetwork' as const, stale: true }
    expect(kindOf(input)).toBe('wrongNetwork')
  })

  it('puts stale data above the last overtime', () => {
    expect(kindOf({ ...inputOf('live-overtime-last'), stale: true })).toBe('stale')
  })

  it('puts the last overtime above a tie', () => {
    const input = inputOf('live-overtime-last')
    const live = input.live === null ? null : { ...input.live, lead: 'tie' as const }
    expect(kindOf({ ...input, live })).toBe('lastOvertime')
  })

  it('puts the final minute above a tie', () => {
    const input = inputOf('live-final-minute')
    const live = input.live === null ? null : { ...input.live, lead: 'tie' as const }
    expect(kindOf({ ...input, live })).toBe('finalMinute')
  })

  it('puts a tie above the cap used up', () => {
    expect(kindOf(inputOf('live-tie', 'fan-capped'))).toBe('tie')
  })

  it('puts the cap used up above the captain', () => {
    const input = inputOf('live-mid', 'captain-blue')
    const player = input.player === null ? null : { ...input.player, remainingCap: bnb('0') }
    expect(kindOf({ ...input, player })).toBe('capUsedUp')
  })
})
