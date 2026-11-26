import type { CreateGameParams } from './create-tx'
import type { LauncherActionName } from '@/lib/actions'
import type { Team } from '@/lib/team'
import type { BnbWei, TokenWei } from '@/lib/units'
import type { Address } from 'viem'

import { teamToId } from '@/lib/team'

export type QueryGroup =
  | 'game'
  | 'player'
  | 'gates'
  | 'logs'
  | 'captain'
  | 'staker'
  | 'vault'
  | 'balance'

export type PickedTeam = Exclude<Team, 'none'>

export type NoParams = { readonly team?: never; readonly amount?: never }

export type ActionParams = {
  readonly depositCaptain: { readonly amount: BnbWei }
  readonly cancel: NoParams
  readonly scheduleAutoLaunch: NoParams
  readonly contribute: { readonly team: PickedTeam; readonly amount: BnbWei }
  readonly launch: NoParams
  readonly refund: NoParams
  readonly claim: NoParams
  readonly claimCaptain: NoParams
  readonly withdrawTriggerBudget: NoParams
  readonly stake: { readonly team: PickedTeam; readonly amount: TokenWei }
  readonly unstake: { readonly amount: TokenWei }
  readonly claimRewards: NoParams
  readonly claimVaultCaptain: NoParams
  readonly approve: { readonly spender: Address; readonly amount: TokenWei }
  readonly createGame: CreateGameParams
}

export type LauncherEventName =
  | 'CaptainDeposited'
  | 'Cancelled'
  | 'AutoLaunchScheduled'
  | 'Contributed'
  | 'Launched'
  | 'Refunded'
  | 'Claimed'
  | 'CaptainVested'
  | 'TriggerBudgetWithdrawn'

export type ValueSource = 'none' | 'amount' | 'quote'

export type LauncherCall = {
  readonly functionName: LauncherActionName
  readonly args: readonly unknown[]
}

export type ActionEntry<Name extends LauncherActionName> = {
  readonly functionName: Name
  readonly args: (params: ActionParams[Name]) => readonly unknown[]
  readonly value: ValueSource
  readonly event: LauncherEventName
  readonly refresh: readonly QueryGroup[]
  readonly gasMultiplierPercent: number
}

export type ActionCatalogue = { readonly [Name in LauncherActionName]: ActionEntry<Name> }

const noArgs = (): readonly unknown[] => []

const PLAIN_GAS = 100

export const LAUNCH_GAS_PERCENT = 120

export const ACTIONS: ActionCatalogue = {
  depositCaptain: {
    functionName: 'depositCaptain',
    args: noArgs,
    value: 'amount',
    event: 'CaptainDeposited',
    refresh: ['game', 'player', 'logs'],
    gasMultiplierPercent: PLAIN_GAS,
  },
  cancel: {
    functionName: 'cancel',
    args: noArgs,
    value: 'none',
    event: 'Cancelled',
    refresh: ['game'],
    gasMultiplierPercent: PLAIN_GAS,
  },
  scheduleAutoLaunch: {
    functionName: 'scheduleAutoLaunch',
    args: noArgs,
    value: 'quote',
    event: 'AutoLaunchScheduled',
    refresh: ['game'],
    gasMultiplierPercent: PLAIN_GAS,
  },
  contribute: {
    functionName: 'contribute',
    args: (params) => [teamToId(params.team)],
    value: 'amount',
    event: 'Contributed',
    refresh: ['game', 'player', 'gates', 'logs'],
    gasMultiplierPercent: PLAIN_GAS,
  },
  launch: {
    functionName: 'launch',
    args: noArgs,
    value: 'none',
    event: 'Launched',
    refresh: ['game', 'player', 'captain'],
    gasMultiplierPercent: LAUNCH_GAS_PERCENT,
  },
  refund: {
    functionName: 'refund',
    args: noArgs,
    value: 'none',
    event: 'Refunded',
    refresh: ['game', 'player'],
    gasMultiplierPercent: PLAIN_GAS,
  },
  claim: {
    functionName: 'claim',
    args: noArgs,
    value: 'none',
    event: 'Claimed',
    refresh: ['player', 'staker'],
    gasMultiplierPercent: PLAIN_GAS,
  },
  claimCaptain: {
    functionName: 'claimCaptain',
    args: noArgs,
    value: 'none',
    event: 'CaptainVested',
    refresh: ['captain', 'staker'],
    gasMultiplierPercent: PLAIN_GAS,
  },
  withdrawTriggerBudget: {
    functionName: 'withdrawTriggerBudget',
    args: noArgs,
    value: 'none',
    event: 'TriggerBudgetWithdrawn',
    refresh: ['game', 'balance'],
    gasMultiplierPercent: PLAIN_GAS,
  },
}

const hasAmount = (params: object): params is { readonly amount: BnbWei } =>
  'amount' in params && typeof params.amount === 'bigint'

export const buildCall = <Name extends LauncherActionName>(
  name: Name,
  params: ActionParams[Name],
): LauncherCall => {
  const entry: ActionEntry<Name> = ACTIONS[name]
  return { functionName: entry.functionName, args: entry.args(params) }
}

export const buildValue = <Name extends LauncherActionName>(
  name: Name,
  params: ActionParams[Name],
  quote: bigint,
): bigint => {
  const source = ACTIONS[name].value
  if (source === 'quote') {
    return quote
  }
  return source === 'amount' && hasAmount(params) ? params.amount : 0n
}

export const withGasMargin = (name: LauncherActionName, estimate: bigint): bigint =>
  (estimate * BigInt(ACTIONS[name].gasMultiplierPercent)) / 100n

const ALWAYS_REFRESH: readonly QueryGroup[] = ['gates', 'balance']

export const refreshGroups = (name: LauncherActionName): readonly QueryGroup[] => [
  ...new Set([...ACTIONS[name].refresh, ...ALWAYS_REFRESH]),
]
