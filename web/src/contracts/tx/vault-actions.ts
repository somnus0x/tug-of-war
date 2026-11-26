import type { ActionParams, QueryGroup } from './actions'
import type { TokenActionName, VaultActionName } from '@/lib/actions'

import { teamToId } from '@/lib/team'

export type VaultTxName = VaultActionName | TokenActionName

export type VaultContract = 'vault' | 'token'

export type VaultEntry<Name extends VaultTxName> = {
  readonly contract: VaultContract
  readonly functionName: string
  readonly args: (params: ActionParams[Name]) => readonly unknown[]
  readonly event: string
  readonly refresh: readonly QueryGroup[]
}

export type VaultCatalogue = { readonly [Name in VaultTxName]: VaultEntry<Name> }

const noArgs = (): readonly unknown[] => []

export const VAULT_ENTRIES: VaultCatalogue = {
  stake: {
    contract: 'vault',
    functionName: 'stake',
    args: (params) => [params.amount, teamToId(params.team)],
    event: 'Staked',
    refresh: ['vault', 'staker'],
  },
  unstake: {
    contract: 'vault',
    functionName: 'unstake',
    args: (params) => [params.amount],
    event: 'Unstaked',
    refresh: ['vault', 'staker'],
  },
  claimRewards: {
    contract: 'vault',
    functionName: 'claimRewards',
    args: noArgs,
    event: 'RewardsClaimed',
    refresh: ['vault', 'staker'],
  },
  claimVaultCaptain: {
    contract: 'vault',
    functionName: 'claimCaptain',
    args: noArgs,
    event: 'CaptainClaimed',
    refresh: ['vault', 'captain'],
  },
  approve: {
    contract: 'token',
    functionName: 'approve',
    args: (params) => [params.spender, params.amount],
    event: 'Approval',
    refresh: ['staker'],
  },
}
