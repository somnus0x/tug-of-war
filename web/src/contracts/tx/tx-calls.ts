import type { ActionParams, QueryGroup } from './actions'
import type { VaultTxName } from './vault-actions'
import type { LauncherActionName, TxActionName } from '@/lib/actions'
import type { Abi, Address } from 'viem'

import { isLauncherAction } from '@/lib/actions'

import { erc20Abi, tugLauncherAbi, tugVaultAbi } from '../abis'
import { ACTIONS, buildCall, buildValue, refreshGroups } from './actions'
import { VAULT_ENTRIES } from './vault-actions'

export type CallPlace = {
  readonly launcher: Address
  readonly target: Address | undefined
}

export type ResolvedCall = {
  readonly address: Address
  readonly abi: Abi
  readonly functionName: string
  readonly args: readonly unknown[]
  readonly needsQuote: boolean
  readonly value: (quote: bigint) => bigint
  readonly gasPercent: number
}

const PLAIN_GAS = 100

const ABIS: Record<'vault' | 'token', Abi> = { vault: tugVaultAbi, token: erc20Abi }

const launcherCall =
  <Name extends LauncherActionName>(name: Name) =>
  (params: ActionParams[Name], place: CallPlace): ResolvedCall => {
    const call = buildCall(name, params)
    return {
      address: place.launcher,
      abi: tugLauncherAbi,
      functionName: call.functionName,
      args: call.args,
      needsQuote: ACTIONS[name].value === 'quote',
      value: (quote) => buildValue(name, params, quote),
      gasPercent: ACTIONS[name].gasMultiplierPercent,
    }
  }

const vaultCall =
  <Name extends VaultTxName>(name: Name) =>
  (params: ActionParams[Name], place: CallPlace): ResolvedCall => {
    const entry = VAULT_ENTRIES[name]
    if (place.target === undefined) {
      throw new Error(`No ${entry.contract} address for ${name}`)
    }
    return {
      address: place.target,
      abi: ABIS[entry.contract],
      functionName: entry.functionName,
      args: entry.args(params),
      needsQuote: false,
      value: () => 0n,
      gasPercent: PLAIN_GAS,
    }
  }

type Resolvers = {
  readonly [Name in TxActionName]: (params: ActionParams[Name], place: CallPlace) => ResolvedCall
}

const RESOLVERS: Resolvers = {
  depositCaptain: launcherCall('depositCaptain'),
  cancel: launcherCall('cancel'),
  scheduleAutoLaunch: launcherCall('scheduleAutoLaunch'),
  contribute: launcherCall('contribute'),
  launch: launcherCall('launch'),
  refund: launcherCall('refund'),
  claim: launcherCall('claim'),
  claimCaptain: launcherCall('claimCaptain'),
  withdrawTriggerBudget: launcherCall('withdrawTriggerBudget'),
  stake: vaultCall('stake'),
  unstake: vaultCall('unstake'),
  claimRewards: vaultCall('claimRewards'),
  claimVaultCaptain: vaultCall('claimVaultCaptain'),
  approve: vaultCall('approve'),
}

export const resolveCall = <Name extends TxActionName>(
  name: Name,
  params: ActionParams[Name],
  place: CallPlace,
): ResolvedCall => {
  const resolve: Resolvers[Name] = RESOLVERS[name]
  return resolve(params, place)
}

const ALWAYS_REFRESH: readonly QueryGroup[] = ['gates', 'balance']

export const txRefreshGroups = (name: TxActionName): readonly QueryGroup[] =>
  isLauncherAction(name)
    ? refreshGroups(name)
    : [...new Set([...VAULT_ENTRIES[name].refresh, ...ALWAYS_REFRESH])]
