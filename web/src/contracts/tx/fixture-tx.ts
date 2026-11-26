import type { SimulatorState } from '../fixtures/simulator'
import type { Gate } from '../types'
import type { ActionParams } from './actions'
import type { LauncherActionName, TxActionName } from '@/lib/actions'
import type { Address, Hash } from 'viem'

import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  encodeErrorResult,
  keccak256,
  toHex,
} from 'viem'

import { bnbWei } from '@/lib/units'

import { errorAbi, tugLauncherAbi } from '../abis'
import {
  canCancel,
  canClaim,
  canClaimCaptain,
  canContribute,
  canDepositCaptain,
  canLaunch,
  canRefund,
  canScheduleAutoLaunch,
  canWithdrawTriggerBudget,
} from '../fixtures/simulator'

export type FixtureMode = 'normal' | 'reject' | 'revert' | 'slow' | 'raced'

export const FIXTURE_DELAYS = {
  simulating: 300,
  wallet: 1200,
  pending: 1500,
  slow: 8000,
} as const

const MODES: readonly FixtureMode[] = ['reject', 'revert', 'slow', 'raced']

export const fixtureModeFromSearch = (searchStr: string): FixtureMode => {
  const value = new URLSearchParams(searchStr).get('tx')
  return MODES.find((mode) => mode === value) ?? 'normal'
}

export const pendingDelay = (mode: FixtureMode): number =>
  mode === 'slow' ? FIXTURE_DELAYS.slow : FIXTURE_DELAYS.pending

type Gates = {
  readonly [Name in LauncherActionName]: (state: SimulatorState, params: ActionParams[Name]) => Gate
}

const GATES: Gates = {
  depositCaptain: (state, params) => canDepositCaptain(state, params.amount),
  cancel: (state) => canCancel(state),
  scheduleAutoLaunch: (state) => canScheduleAutoLaunch(state),
  contribute: (state, params) => canContribute(state, params.team, bnbWei(params.amount)),
  launch: (state) => canLaunch(state),
  refund: (state) => canRefund(state),
  claim: (state) => canClaim(state),
  claimCaptain: (state) => canClaimCaptain(state),
  withdrawTriggerBudget: (state) => canWithdrawTriggerBudget(state),
}

export const fixtureGate = <Name extends LauncherActionName>(
  name: Name,
  state: SimulatorState,
  params: ActionParams[Name],
): Gate => {
  const gate: Gates[Name] = GATES[name]
  return gate(state, params)
}

const PLAUSIBLE_REVERTS: Record<TxActionName, string> = {
  depositCaptain: 'AcceptWindowClosed',
  cancel: 'NotCancellable',
  scheduleAutoLaunch: 'InsufficientTriggerFee',
  contribute: 'BuyInClosed',
  launch: 'BelowCreationFloor',
  refund: 'MinRaiseMet',
  claim: 'NothingToClaim',
  claimCaptain: 'NothingToClaim',
  withdrawTriggerBudget: 'TriggerBudgetLocked',
  stake: 'TransferFailed',
  unstake: 'InsufficientStake',
  claimRewards: 'NothingToClaim',
  claimVaultCaptain: 'NothingToClaim',
  approve: 'TransferFailed',
}

export const plausibleRevert = (name: TxActionName, gate: Gate): string =>
  gate.ok ? PLAUSIBLE_REVERTS[name] : gate.reason

export const revertError = (
  name: TxActionName,
  launcher: Address,
  errorName: string,
  args: readonly unknown[],
): ContractFunctionExecutionError => {
  const cause = new ContractFunctionRevertedError({
    abi: tugLauncherAbi,
    data: encodeErrorResult({ abi: errorAbi, errorName }),
    functionName: name,
  })
  return new ContractFunctionExecutionError(cause, {
    abi: tugLauncherAbi,
    functionName: name,
    args,
    contractAddress: launcher,
  })
}

export const rejectionError = (): UserRejectedRequestError =>
  new UserRejectedRequestError(new Error('User rejected the request.'))

export const fixtureHash = (name: TxActionName, seed: number): Hash =>
  keccak256(toHex(`${name}:${seed}`))
