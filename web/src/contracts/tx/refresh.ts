import type { QueryGroup } from './actions'
import type { LauncherActionName } from '@/lib/actions'
import type { Address } from 'viem'

import { refreshGroups } from './actions'

export type InvalidationKey = readonly (string | number)[]

const WALLET_GROUPS: readonly QueryGroup[] = ['player', 'gates', 'staker', 'captain', 'balance']

export const keyForGroup = (
  group: QueryGroup,
  chainId: number,
  launcher: Address,
): InvalidationKey => (group === 'balance' ? ['balance'] : [group, chainId, launcher])

export const invalidationKeys = (
  name: LauncherActionName,
  chainId: number,
  launcher: Address,
): readonly InvalidationKey[] =>
  refreshGroups(name).map((group) => keyForGroup(group, chainId, launcher))

export const walletScopedKeys = (chainId: number, launcher: Address): readonly InvalidationKey[] =>
  WALLET_GROUPS.map((group) => keyForGroup(group, chainId, launcher))
