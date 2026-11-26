import { describe, expect, it } from 'vitest'

import { deriveScreen } from './derive-screen'
import { LOAD, RULES, gameOf } from './fixture-games'

describe('deriveScreen', () => {
  it('waits with no captain in', () => {
    expect(deriveScreen(gameOf('waiting-none'), RULES, LOAD)).toEqual({
      kind: 'waiting',
      acceptOpen: true,
      captainsIn: { blue: false, red: false },
      acceptLeft: 3300,
    })
  })

  it('waits with one captain in', () => {
    const screen = deriveScreen(gameOf('waiting-blue-in'), RULES, LOAD)
    expect(screen).toMatchObject({ kind: 'waiting', captainsIn: { blue: true, red: false } })
  })

  it('closes the accept window locally but stays on the waiting screen', () => {
    const screen = deriveScreen(gameOf('waiting-expired'), RULES, LOAD)
    expect(screen).toMatchObject({ kind: 'waiting', acceptOpen: false, acceptLeft: 0 })
  })

  it('shows the live game during buy-in', () => {
    const screen = deriveScreen(gameOf('live-mid'), RULES, LOAD)
    expect(screen.kind).toBe('live')
  })

  it('stays live and closing past the deadline until the phase changes', () => {
    const game = gameOf('live-mid')
    const screen = deriveScreen(game, RULES, game.deadline + 30)
    expect(screen).toMatchObject({ kind: 'live', live: { clock: 'closing', left: 0 } })
  })

  it('awaits launch after the clock', () => {
    const game = gameOf('ended-can-launch')
    expect(deriveScreen(game, RULES, LOAD)).toEqual({
      kind: 'awaitingLaunch',
      graceEnd: game.deadline + RULES.launchGrace,
      graceLeft: RULES.launchGrace - 45,
    })
  })

  it('refunds when the minimum was missed', () => {
    const game = gameOf('refunding-min-missed')
    expect(deriveScreen(game, RULES, LOAD)).toEqual({
      kind: 'refunding',
      reason: 'minMissed',
      graceEnd: game.deadline + RULES.launchGrace,
    })
  })

  it('refunds when the launch grace expired', () => {
    const screen = deriveScreen(gameOf('refunding-grace-expired'), RULES, LOAD)
    expect(screen).toMatchObject({ kind: 'refunding', reason: 'graceExpired' })
  })

  it('shows launched and cancelled', () => {
    expect(deriveScreen(gameOf('launched'), RULES, LOAD)).toEqual({ kind: 'launched' })
    expect(deriveScreen(gameOf('cancelled'), RULES, LOAD)).toEqual({ kind: 'cancelled' })
  })
})
