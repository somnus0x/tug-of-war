import type { HomeSource } from './home-types'

import { createFixtureHomeSource } from './fixtures/home-fixture'
import { createChainHomeSource } from './home-chain-source'
import { FIXTURES_ON, gameSource } from './source'

export const homeSource: HomeSource = FIXTURES_ON
  ? createFixtureHomeSource(gameSource)
  : createChainHomeSource()
