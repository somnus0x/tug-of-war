import type { VaultSource } from './vault-types'

import { createVaultFixtureSource } from './fixtures/vault-fixture-source'
import { FIXTURES_ON, fixtureWorld } from './source'
import { createVaultChainSource } from './vault-chain-source'

export const vaultSource: VaultSource =
  import.meta.env.DEV && FIXTURES_ON && fixtureWorld !== null
    ? createVaultFixtureSource(fixtureWorld)
    : createVaultChainSource()
