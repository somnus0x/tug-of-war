import type { VaultSource } from '../vault-types'
import type { FixtureWorld } from './world'

import { readCaptain } from './captain-world'
import { vaultWorldOf } from './vault-world'

export const createVaultFixtureSource = (world: FixtureWorld): VaultSource => {
  const vaults = vaultWorldOf(world)
  return {
    readVault: ({ launcher }, scope) => Promise.resolve(vaults.vault(launcher, scope)),
    readStaker: ({ launcher }, account, scope) =>
      Promise.resolve(vaults.staker({ launcher, account, scope })),
    readCaptain: ({ launcher }, account, scope) =>
      Promise.resolve(readCaptain(vaults, { launcher, account, scope })),
  }
}
