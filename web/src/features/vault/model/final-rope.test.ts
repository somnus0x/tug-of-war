import { describe, expect, it } from 'vitest'

import { buildGame } from '@/contracts/fixtures/builder'
import { fixtureInput } from '@/contracts/fixtures/catalog'
import { FIXTURE_RULES } from '@/contracts/fixtures/constants'
import { bps } from '@/lib/units'

import { COIN_ART } from './coin-art'
import { finalRopeOf, poolFactsOf } from './final-rope'

const game = {
  ...buildGame(fixtureInput('launched'), {
    launcher: '0x0000000000000000000000000000000000000001',
    loadTime: 1_800_000_000,
    now: 1_800_000_000,
  }),
  finalBlueShareBps: bps(6000),
}

describe('final rope panel', () => {
  it('reads the pull, the bonus split and the crews', () => {
    const rope = finalRopeOf(game)
    expect(rope.blueBps).toBe(game.ropeBps)
    expect(rope.rows.map((row) => row.key)).toEqual(['held', 'bonus', 'crews'])
    expect(rope.rows[0]?.label).toMatch(/^Blue held \d+\.\d% of the pull$/)
    expect(rope.rows[0]?.value).toBe('4.10 / 3.60 pull')
    expect(rope.rows[1]?.value).toBe('Blue 60.0% · Red 40.0%')
    expect(rope.rows[2]?.value).toBe(
      `Blue ${game.playersByTeam.blue} wallets · Red ${game.playersByTeam.red} wallets`,
    )
    expect(rope.picture).toMatch(/^Final rope: Blue \d+\.\d%, Red \d+\.\d%\.$/)
  })

  it('states the pool at launch from the raise and the pool share', () => {
    expect(poolFactsOf(game, FIXTURE_RULES)).toEqual({ bnb: '5.00', coins: '500,000' })
  })

  it('draws every part of the coin mark', () => {
    for (const art of Object.values(COIN_ART)) {
      expect(art.path).not.toBe('')
      expect(art.width).toBe(14)
    }
  })
})
