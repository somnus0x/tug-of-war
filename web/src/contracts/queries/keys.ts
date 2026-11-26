import type { ContributeDraft, SourceScope } from '../types'
import type { Phase } from '@/lib/phase'
import type { Address } from 'viem'

import { scopeKey } from '../scope'

export const NO_ACCOUNT = 'none'

export const queryKeys = {
  launcher: (chainId: number, launcher: Address, scope: SourceScope) =>
    ['launcher', chainId, launcher, ...scopeKey(scope)] as const,
  game: (chainId: number, launcher: Address, scope: SourceScope) =>
    ['game', chainId, launcher, ...scopeKey(scope)] as const,
  rules: (chainId: number, launcher: Address, scope: SourceScope) =>
    ['rules', chainId, launcher, ...scopeKey(scope)] as const,
  logs: (chainId: number, launcher: Address, scope: SourceScope) =>
    ['logs', chainId, launcher, ...scopeKey(scope)] as const,
  player: (chainId: number, launcher: Address, account: Address | undefined, scope: SourceScope) =>
    ['player', chainId, launcher, account ?? NO_ACCOUNT, ...scopeKey(scope)] as const,
  gates: (
    chainId: number,
    launcher: Address,
    account: Address | undefined,
    phase: Phase | undefined,
    draft: ContributeDraft | null,
    scope: SourceScope,
  ) =>
    [
      'gates',
      chainId,
      launcher,
      account ?? NO_ACCOUNT,
      phase ?? 'unknown',
      draft?.team ?? 'none',
      draft === null ? '0' : draft.amount.toString(),
      ...scopeKey(scope),
    ] as const,
}
