import type { CreateSource } from './create-types'

import { createChainCreateSource } from './create-chain-source'
import { createFixtureCreateSource } from './fixtures/create-fixture'
import { FIXTURES_ON } from './source'

export const createSource: CreateSource = FIXTURES_ON
  ? createFixtureCreateSource()
  : createChainCreateSource()
