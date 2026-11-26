import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from '@/contracts/fixtures/constants'
import { pullWei } from '@/lib/units'

import { deriveLive } from './derive-live'
import { LOAD, RULES, bnb, gameOf, withPull } from './fixture-games'

describe('deriveLive clock', () => {
  it('runs with time to spare', () => {
    expect(deriveLive(gameOf('live-mid'), RULES, LOAD)).toMatchObject({
      left: 84,
      clock: 'running',
    })
  })

  it('enters the final minute inside the overtime window', () => {
    expect(deriveLive(gameOf('live-final-minute'), RULES, LOAD).clock).toBe('final')
  })

  it('treats exactly the window edge as the final minute', () => {
    const game = gameOf('live-mid')
    expect(deriveLive(game, RULES, game.deadline - RULES.overtimeWindow).clock).toBe('final')
    expect(deriveLive(game, RULES, game.deadline - RULES.overtimeWindow - 1).clock).toBe('running')
  })

  it('reports overtime once an extension is used', () => {
    expect(deriveLive(gameOf('live-overtime-1'), RULES, LOAD).clock).toBe('overtime')
  })

  it('puts overtime ahead of the final minute', () => {
    const game = gameOf('live-overtime-1')
    expect(deriveLive(game, RULES, game.deadline - 5).clock).toBe('overtime')
  })

  it('reports the last overtime when every extension is used', () => {
    expect(deriveLive(gameOf('live-overtime-last'), RULES, LOAD).clock).toBe('lastOvertime')
  })

  it('reports closing when the local clock reaches zero', () => {
    const game = gameOf('live-overtime-last')
    expect(deriveLive(game, RULES, game.deadline)).toMatchObject({ left: 0, clock: 'closing' })
    expect(deriveLive(game, RULES, game.deadline + 7)).toMatchObject({ left: 0, clock: 'closing' })
  })
})

describe('deriveLive lead and bonus', () => {
  it('finds an exact tie', () => {
    const live = deriveLive(gameOf('live-tie'), RULES, LOAD)
    expect(live).toMatchObject({ lead: 'tie', leaderShareBps: 5000, capped: false })
  })

  it('compares pull totals, not the rounded rope', () => {
    const game = gameOf('live-tie')
    const blueAhead = {
      ...game,
      pullByTeam: { blue: pullWei(game.pullByTeam.blue + 1n), red: game.pullByTeam.red },
    }
    expect(blueAhead.ropeBps).toBe(5000)
    expect(deriveLive(blueAhead, RULES, LOAD).lead).toBe('blue')
  })

  it('names the red share when red leads', () => {
    const live = deriveLive(gameOf('live-overtime-1'), RULES, LOAD)
    expect(live.lead).toBe('red')
    expect(live.leaderShareBps).toBe(10_000 - gameOf('live-overtime-1').ropeBps)
  })

  it('caps a blue-heavy rope at the maximum bonus share', () => {
    const game = gameOf('live-one-sided')
    const live = deriveLive(game, RULES, LOAD)
    expect(game.ropeBps).toBeGreaterThan(7000)
    expect(live).toMatchObject({ bonusBlueBps: 7000, capped: true, oneSided: false, lead: 'blue' })
  })

  it('caps a red-heavy rope at the floor', () => {
    const live = deriveLive(withPull(gameOf('live-mid'), '1', '9'), RULES, LOAD)
    expect(live).toMatchObject({
      bonusBlueBps: 3000,
      capped: true,
      lead: 'red',
      leaderShareBps: 9000,
    })
  })

  it('leaves the bonus split alone inside the cap', () => {
    const game = gameOf('live-mid')
    const live = deriveLive(game, RULES, LOAD)
    expect(live).toMatchObject({ bonusBlueBps: game.ropeBps, capped: false })
  })

  it('gives blue the whole bonus when red has no pull', () => {
    const live = deriveLive(withPull(gameOf('live-mid'), '2', '0'), RULES, LOAD)
    expect(live).toMatchObject({ oneSided: true, bonusBlueBps: 10_000, capped: false })
  })

  it('gives red the whole bonus when blue has no pull', () => {
    const live = deriveLive(withPull(gameOf('live-mid'), '0', '2'), RULES, LOAD)
    expect(live).toMatchObject({ oneSided: true, bonusBlueBps: 0, capped: false, lead: 'red' })
  })

  it('splits evenly with no pull on either side', () => {
    const live = deriveLive(withPull(gameOf('live-mid'), '0', '0'), RULES, LOAD)
    expect(live).toMatchObject({ oneSided: true, bonusBlueBps: 5000, capped: false, lead: 'tie' })
  })
})

describe('deriveLive minimum and auto-launch', () => {
  it('reports the minimum not met', () => {
    expect(deriveLive(gameOf('live-min-not-met'), RULES, LOAD).minMet).toBe(false)
  })

  it('reports the minimum met, including exactly at the minimum', () => {
    expect(deriveLive(gameOf('live-mid'), RULES, LOAD).minMet).toBe(true)
    const exact = { ...gameOf('live-min-not-met'), raised: bnb('3') }
    expect(deriveLive(exact, RULES, LOAD).minMet).toBe(true)
  })

  it('reports auto-launch from the trigger funder', () => {
    expect(deriveLive(gameOf('live-mid'), RULES, LOAD).autoLaunch).toBe(false)
    const scheduled = { ...gameOf('live-mid'), triggerFunder: FIXTURE_ADDRESSES.funder }
    expect(deriveLive(scheduled, RULES, LOAD).autoLaunch).toBe(true)
  })
})
