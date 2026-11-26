import type { Address } from 'viem'

import { getAddress } from 'viem'
import { describe, expect, it } from 'vitest'

import { buildGame } from '@/contracts/fixtures/builder'
import { fixtureInput } from '@/contracts/fixtures/catalog'
import { invalidationKeys } from '@/contracts/tx/refresh'

import { routedGame } from './routed-game'

const ROUTE: Address = '0x8e6c4a2b0d9f7e5c3a1b2d4f6e8a0c9b7d5e3f1a'

describe('routedGame', () => {
  it('uses the launcher the page reads with, however the chain cases it', () => {
    const fromChain = buildGame(fixtureInput('launched'), {
      launcher: getAddress(ROUTE),
      loadTime: 1_800_000_000,
      now: 1_800_000_000,
    })
    expect(fromChain.launcher).not.toBe(ROUTE)
    const game = routedGame(fromChain, ROUTE)
    expect(game.launcher).toBe(ROUTE)
    const refreshed = invalidationKeys('approve', 97, game.launcher).map((key) => key[2])
    expect(refreshed).toContain(ROUTE)
  })

  it('keeps the same object when the cases already agree', () => {
    const game = buildGame(fixtureInput('launched'), {
      launcher: ROUTE,
      loadTime: 1_800_000_000,
      now: 1_800_000_000,
    })
    expect(routedGame(game, ROUTE)).toBe(game)
  })
})
