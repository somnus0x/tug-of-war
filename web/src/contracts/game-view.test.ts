import type { GameView } from './client'
import type { Address } from 'viem'

import { describe, expectTypeOf, it } from 'vitest'

describe('GameView', () => {
  it('is inferred from the launcher ABI', () => {
    expectTypeOf<GameView['phase']>().toEqualTypeOf<number>()
    expectTypeOf<GameView['ropeBps']>().toEqualTypeOf<number>()
    expectTypeOf<GameView['pullByTeam']['blue']>().toEqualTypeOf<bigint>()
    expectTypeOf<GameView['config']['walletCap']>().toEqualTypeOf<bigint>()
    expectTypeOf<GameView['token']>().toEqualTypeOf<Address>()
    expectTypeOf<GameView>().not.toBeAny()
  })
})
