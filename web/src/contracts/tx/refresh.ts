import type { QueryGroup } from './actions'
import type { TxActionName } from '@/lib/actions'
import type { Address } from 'viem'

import { txRefreshGroups } from './tx-calls'

export type InvalidationKey = readonly (string | number)[]

const WALLET_GROUPS: readonly QueryGroup[] = ['player', 'gates', 'staker', 'captain', 'balance']

export const keyForGroup = (
  group: QueryGroup,
  chainId: number,
  launcher: Address,
): InvalidationKey => (group === 'balance' ? ['balance'] : [group, chainId, launcher])

export const invalidationKeys = (
  name: TxActionName,
  chainId: number,
  launcher: Address,
): readonly InvalidationKey[] =>
  txRefreshGroups(name).map((group) => keyForGroup(group, chainId, launcher))

export const walletScopedKeys = (chainId: number, launcher: Address): readonly InvalidationKey[] =>
  WALLET_GROUPS.map((group) => keyForGroup(group, chainId, launcher))
