import type { FixtureWorld } from '../fixtures/world'
import type { SourceScope } from '../types'
import type { ActionParams } from './actions'
import type { TxErrorInfo } from './classify-error'
import type { FixtureMode } from './fixture-tx'
import type { TxEvent } from './lifecycle'
import type { ActionOutcomes } from './outcome'
import type { PendingStore } from './pending-store'
import type { LauncherActionName } from '@/lib/actions'
import type { QueryClient } from '@tanstack/react-query'
import type { Abi, Address, Hash, TransactionReceipt } from 'viem'
import type { Config } from 'wagmi'

import { getAccount, simulateContract, writeContract } from 'wagmi/actions'

import { tugLauncherAbi } from '../abis'
import { publicClient } from '../client'
import { applyEffect } from '../fixtures/effects'
import { ACTIONS, buildCall, buildValue, withGasMargin } from './actions'
import { classifyError } from './classify-error'
import {
  FIXTURE_DELAYS,
  fixtureGate,
  fixtureHash,
  pendingDelay,
  plausibleRevert,
  rejectionError,
  revertError,
} from './fixture-tx'
import { decodeOutcome } from './outcome'
import { invalidationKeys } from './refresh'

export const RECHECK_MS = 4000

const launcherAbi: Abi = tugLauncherAbi

export type TxReport<Name extends LauncherActionName> = {
  readonly onSuccess: (outcome: ActionOutcomes[Name] | null, hash: Hash) => void
  readonly onFailure: (error: TxErrorInfo, hash: Hash | undefined) => void
  readonly onSubmitted: (hash: Hash) => void
}

export type RunnerContext<Name extends LauncherActionName> = {
  readonly action: Name
  readonly launcher: Address
  readonly chainId: number
  readonly queryClient: QueryClient
  readonly dispatch: (event: TxEvent<ActionOutcomes[Name]>) => void
  readonly alive: () => boolean
  readonly report: () => TxReport<Name>
}

export class Superseded extends Error {}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const pause = async <Name extends LauncherActionName>(
  context: RunnerContext<Name>,
  ms: number,
): Promise<void> => {
  await sleep(ms)
  if (!context.alive()) {
    throw new Superseded()
  }
}

const invalidate = async <Name extends LauncherActionName>(
  context: RunnerContext<Name>,
): Promise<void> => {
  await Promise.all(
    invalidationKeys(context.action, context.chainId, context.launcher).map((queryKey) =>
      context.queryClient.invalidateQueries({ queryKey }),
    ),
  )
}

export const failWith = <Name extends LauncherActionName>(
  context: RunnerContext<Name>,
  error: unknown,
  hash?: Hash,
): void => {
  if (error instanceof Superseded || !context.alive()) {
    return
  }
  const info = classifyError(error, context.action)
  context.dispatch({ type: 'failed', error: info })
  context.report().onFailure(info, hash)
}

const succeed = async <Name extends LauncherActionName>(
  context: RunnerContext<Name>,
  outcome: ActionOutcomes[Name] | null,
  hash: Hash,
): Promise<void> => {
  await invalidate(context)
  if (!context.alive()) {
    return
  }
  context.dispatch({ type: 'mined', outcome })
  context.report().onSuccess(outcome, hash)
}

const revertReason = async (receipt: TransactionReceipt): Promise<unknown> => {
  try {
    const txn = await publicClient.getTransaction({ hash: receipt.transactionHash })
    await publicClient.call({
      account: txn.from,
      to: txn.to,
      data: txn.input,
      value: txn.value,
      blockNumber: receipt.blockNumber,
    })
    return new Error('The transaction reverted.')
  } catch (error) {
    return error
  }
}

type Watch = { current: Hash; cancelled: boolean }

const settle = async <Name extends LauncherActionName>(
  context: RunnerContext<Name>,
  account: Address,
  receipt: TransactionReceipt,
): Promise<void> => {
  if (receipt.status === 'reverted') {
    failWith(context, await revertReason(receipt), receipt.transactionHash)
    return
  }
  const outcome = decodeOutcome(context.action, {
    launcher: context.launcher,
    account,
    logs: receipt.logs,
  })
  await succeed(context, outcome, receipt.transactionHash)
}

const watchOnce = async <Name extends LauncherActionName>(
  context: RunnerContext<Name>,
  pending: PendingStore,
  account: Address,
  watch: Watch,
): Promise<void> => {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: watch.current,
      confirmations: 1,
      onReplaced: (replacement) => {
        const next = replacement.transaction.hash
        pending.replace(watch.current, next)
        watch.current = next
        if (!context.alive()) return
        watch.cancelled = replacement.reason === 'cancelled'
        context.dispatch({ type: 'replaced', hash: next, reason: replacement.reason })
      },
    })
    pending.remove(receipt.transactionHash)
    if (context.alive() && !watch.cancelled) {
      await settle(context, account, receipt)
    }
  } catch {
    if (!context.alive()) {
      return
    }
    context.dispatch({ type: 'receiptUnknown' })
    await sleep(RECHECK_MS)
    if (context.alive()) {
      await watchOnce(context, pending, account, watch)
    }
  }
}

export const followReceipt = <Name extends LauncherActionName>(
  context: RunnerContext<Name>,
  pending: PendingStore,
  account: Address,
  hash: Hash,
): Promise<void> => watchOnce(context, pending, account, { current: hash, cancelled: false })

export type ChainRun = {
  readonly config: Config
  readonly pending: PendingStore
  readonly ensureNetwork: () => Promise<boolean>
}

export const runChainTx = async <Name extends LauncherActionName>(
  context: RunnerContext<Name>,
  run: ChainRun,
  params: ActionParams[Name],
): Promise<void> => {
  let hash: Hash | undefined
  try {
    if (!(await run.ensureNetwork()) || !context.alive()) {
      context.dispatch({ type: 'reset' })
      return
    }
    const account = getAccount(run.config).address
    if (account === undefined) {
      context.dispatch({ type: 'reset' })
      return
    }
    const call = buildCall(context.action, params)
    const quote =
      ACTIONS[context.action].value === 'quote'
        ? await publicClient.readContract({
            address: context.launcher,
            abi: tugLauncherAbi,
            functionName: 'autoLaunchQuote',
          })
        : 0n
    const base = {
      address: context.launcher,
      abi: launcherAbi,
      functionName: call.functionName,
      args: call.args,
      value: buildValue(context.action, params, quote),
      account,
    }
    const gas =
      ACTIONS[context.action].gasMultiplierPercent === 100
        ? undefined
        : withGasMargin(context.action, await publicClient.estimateContractGas(base))
    const { request } = await simulateContract(run.config, {
      ...base,
      chainId: context.chainId,
      ...(gas === undefined ? {} : { gas }),
    })
    if (!context.alive()) return
    context.dispatch({ type: 'simulated' })
    hash = await writeContract(run.config, request)
    run.pending.save({
      hash,
      action: context.action,
      launcher: context.launcher,
      account,
      chainId: context.chainId,
    })
    if (!context.alive()) return
    context.dispatch({ type: 'submitted', hash })
    context.report().onSubmitted(hash)
    await followReceipt(context, run.pending, account, hash)
  } catch (error) {
    failWith(context, error, hash)
  }
}

export type FixtureRun = {
  readonly world: FixtureWorld
  readonly scope: SourceScope
  readonly account: Address | undefined
  readonly mode: FixtureMode
}

export const runFixtureTx = async <Name extends LauncherActionName>(
  context: RunnerContext<Name>,
  run: FixtureRun,
  params: ActionParams[Name],
): Promise<void> => {
  let hash: Hash | undefined
  const { world, scope, account } = run
  const stateNow = () => world.simulatorState(context.launcher, account, scope)
  const args = buildCall(context.action, params).args
  try {
    await pause(context, FIXTURE_DELAYS.simulating)
    const before = fixtureGate(context.action, stateNow(), params)
    if (!before.ok) {
      throw revertError(context.action, context.launcher, before.reason, args)
    }
    context.dispatch({ type: 'simulated' })
    await pause(context, FIXTURE_DELAYS.wallet)
    if (run.mode === 'reject') {
      throw rejectionError()
    }
    hash = fixtureHash(context.action, Date.now())
    context.dispatch({ type: 'submitted', hash })
    context.report().onSubmitted(hash)
    await pause(context, pendingDelay(run.mode))
    const state = stateNow()
    const gate = fixtureGate(context.action, state, params)
    if (run.mode === 'revert' || !gate.ok) {
      throw revertError(
        context.action,
        context.launcher,
        plausibleRevert(context.action, gate),
        args,
      )
    }
    const player = world.player(context.launcher, account, scope, state.now).player
    const overlay = world.overlay(context.launcher, scope)
    const result = applyEffect({ action: context.action, params, state, player, overlay })
    world.commit(context.launcher, scope, result.overlay)
    await succeed(context, result.outcome, hash)
  } catch (error) {
    failWith(context, error, hash)
  }
}
