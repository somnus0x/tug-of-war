import type { CreateSource } from './create-types'

import { createChainCreateSource } from './create-chain-source'
import { createFixtureCreateSource } from './fixtures/create-fixture'
import { FIXTURES_ON } from './source'

export const createSource: CreateSource =
  import.meta.env.DEV && FIXTURES_ON ? createFixtureCreateSource() : createChainCreateSource()
