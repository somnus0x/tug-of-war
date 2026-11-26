import type { SourceScope } from '../types'
import type { Address } from 'viem'

import { scopeKey } from '../scope'
import { NO_ACCOUNT } from './keys'

export const vaultKeys = {
  vault: (chainId: number, launcher: Address, scope: SourceScope) =>
    ['vault', chainId, launcher, ...scopeKey(scope)] as const,
  staker: (chainId: number, launcher: Address, account: Address | undefined, scope: SourceScope) =>
    ['staker', chainId, launcher, account ?? NO_ACCOUNT, ...scopeKey(scope)] as const,
}
