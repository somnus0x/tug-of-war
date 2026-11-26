import type { ViewerName } from '@/contracts/fixtures/viewers'
import type { Game } from '@/contracts/types'

import { describe, expect, it } from 'vitest'

import { captainRead, viewerAddress } from '@/contracts/fixtures/viewers'

import { RULES, bnb, gameOf, playerOf } from './fixture-games'
import { knownCrew } from './known-crew'

const captainsOf = (game: Game) => ({
  blue: captainRead(game, RULES, game.config.captainBlue)?.player ?? null,
  red: captainRead(game, RULES, game.config.captainRed)?.player ?? null,
})

const crewFor = (game: Game, viewer: ViewerName, captains = captainsOf(game)) => {
  const account = viewerAddress(viewer)
  return knownCrew({
    game,
    account,
    player: account === undefined ? null : playerOf(viewer, game),
    captains,
  })
}

describe('knownCrew', () => {
  it('puts both captains at their side and the rest in the stand for a visitor', () => {
    const game = gameOf('live-mid')
    const { crew, unknownWallets } = crewFor(game, 'visitor')
    expect(crew.blue).toHaveLength(1)
    expect(crew.red).toHaveLength(1)
    expect(crew.blue[0]?.captain).toBe(true)
    expect(crew.blue[0]?.me).toBe(false)
    expect(crew.blue[0]?.bnb).toBe(game.config.captainMinDeposit)
    expect(crew.blue[0]?.pull).toBe(bnb('0.2'))
    expect(unknownWallets).toEqual({
      blue: game.playersByTeam.blue - 1,
      red: game.playersByTeam.red - 1,
    })
  })

  it('adds the viewer as a real figure on their own team', () => {
    const game = gameOf('live-mid')
    const { crew, unknownWallets } = crewFor(game, 'fan-blue')
    expect(crew.blue).toHaveLength(2)
    expect(crew.blue[1]?.me).toBe(true)
    expect(crew.blue[1]?.bnb).toBe(bnb('0.25'))
    expect(crew.red).toHaveLength(1)
    expect(unknownWallets.blue).toBe(game.playersByTeam.blue - 2)
  })

  it('leaves a viewer without a team out of the crew', () => {
    const game = gameOf('live-mid')
    const { crew } = crewFor(game, 'fan-new')
    expect(crew.blue.some((fan) => fan.me)).toBe(false)
    expect(crew.red.some((fan) => fan.me)).toBe(false)
  })

  it('marks a captain viewer once, as both captain and you', () => {
    const game = gameOf('live-mid')
    const { crew } = crewFor(game, 'captain-blue')
    expect(crew.blue).toHaveLength(1)
    expect(crew.blue[0]?.me).toBe(true)
    expect(crew.blue[0]?.captain).toBe(true)
  })

  it('shows only the captain who has deposited while waiting', () => {
    const { crew, unknownWallets } = crewFor(gameOf('waiting-blue-in'), 'visitor')
    expect(crew.blue).toHaveLength(1)
    expect(crew.red).toHaveLength(0)
    expect(unknownWallets.red).toBe(0)
  })

  it('uses each captain’s real deposit, even when the minimum is zero', () => {
    const live = gameOf('live-mid')
    const game = { ...live, config: { ...live.config, captainMinDeposit: bnb('0') } }
    const blue = captainsOf(live).blue
    const captains = {
      blue: blue === null ? null : { ...blue, contribution: bnb('0.3') },
      red: captainsOf(live).red,
    }
    const { crew, unknownWallets } = crewFor(game, 'visitor', captains)
    expect(crew.blue[0]?.bnb).toBe(bnb('0.3'))
    expect(crew.red[0]?.bnb).toBe(bnb('0.1'))
    expect(crew.blue.length + unknownWallets.blue).toBe(game.playersByTeam.blue)
  })

  it('keeps a deposited captain as a stand head until the captain view arrives', () => {
    const game = gameOf('live-mid')
    const { crew, unknownWallets } = crewFor(game, 'visitor', { blue: null, red: null })
    expect(crew.blue).toHaveLength(0)
    expect(unknownWallets.blue).toBe(game.playersByTeam.blue)
  })

  it('never counts fewer stand heads than zero', () => {
    const game = { ...gameOf('live-mid'), playersByTeam: { blue: 0, red: 0 } }
    expect(crewFor(game, 'fan-blue').unknownWallets).toEqual({ blue: 0, red: 0 })
  })
})
