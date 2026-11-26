import type { SourceScope } from '../types'

import { scopeKey } from '../scope'

export const createQueryKeys = {
  setup: (chainId: number, scope: SourceScope) =>
    ['createSetup', chainId, ...scopeKey(scope)] as const,
  limits: (chainId: number, scope: SourceScope) =>
    ['createLimits', chainId, ...scopeKey(scope)] as const,
}
