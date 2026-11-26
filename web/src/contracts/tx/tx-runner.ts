import type { FixtureWorld } from '../fixtures/world'
import type { SourceScope } from '../types'
import type { ActionParams } from './actions'
import type { TxErrorInfo } from './classify-error'
import type { FixtureMode } from './fixture-tx'
import type { TxEvent } from './lifecycle'
import type { ActionOutcomes } from './outcome'
import type { PendingStore } from './pending-store'
import type { TxActionName } from '@/lib/actions'
import type { QueryClient } from '@tanstack/react-query'
import type { Address, Hash, TransactionReceipt } from 'viem'
import type { Config } from 'wagmi'

import { getAccount, simulateContract, writeContract } from 'wagmi/actions'

import { tugLauncherAbi } from '../abis'
import { publicClient } from '../client'
import { classifyError } from './classify-error'
import { fixtureStep } from './fixture-step'
import {
  FIXTURE_DELAYS,
  fixtureHash,
  pendingDelay,
  plausibleRevert,
  rejectionError,
  revertError,
} from './fixture-tx'
import { decodeOutcome } from './outcome'
import { invalidationKeys } from './refresh'
import { resolveCall } from './tx-calls'

export const RECHECK_MS = 4000

export type TxReport<Name extends TxActionName> = {
  readonly onSuccess: (outcome: ActionOutcomes[Name] | null, hash: Hash) => void
  readonly onFailure: (error: TxErrorInfo, hash: Hash | undefined) => void
  readonly onSubmitted: (hash: Hash) => void
}

export type RunnerContext<Name extends TxActionName> = {
  readonly action: Name
  readonly launcher: Address
  readonly target: Address | undefined
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

const pause = async <Name extends TxActionName>(
  context: RunnerContext<Name>,
  ms: number,
): Promise<void> => {
  await sleep(ms)
  if (!context.alive()) {
    throw new Superseded()
  }
}

const invalidate = async <Name extends TxActionName>(
  context: RunnerContext<Name>,
): Promise<void> => {
  await Promise.all(
    invalidationKeys(context.action, context.chainId, context.launcher).map((queryKey) =>
      context.queryClient.invalidateQueries({ queryKey }),
    ),
  )
}

export const failWith = <Name extends TxActionName>(
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

const succeed = async <Name extends TxActionName>(
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

const settle = async <Name extends TxActionName>(
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
    target: context.target,
    account,
    logs: receipt.logs,
  })
  await succeed(context, outcome, receipt.transactionHash)
}

const watchOnce = async <Name extends TxActionName>(
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

export const followReceipt = <Name extends TxActionName>(
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

export const runChainTx = async <Name extends TxActionName>(
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
    const call = resolveCall(context.action, params, context)
    const quote = call.needsQuote
      ? await publicClient.readContract({
          address: context.launcher,
          abi: tugLauncherAbi,
          functionName: 'autoLaunchQuote',
        })
      : 0n
    const base = {
      address: call.address,
      abi: call.abi,
      functionName: call.functionName,
      args: call.args,
      value: call.value(quote),
      account,
    }
    const gas =
      call.gasPercent === 100
        ? undefined
        : ((await publicClient.estimateContractGas(base)) * BigInt(call.gasPercent)) / 100n
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

export const runFixtureTx = async <Name extends TxActionName>(
  context: RunnerContext<Name>,
  run: FixtureRun,
  params: ActionParams[Name],
): Promise<void> => {
  let hash: Hash | undefined
  const { world, scope, account } = run
  const step = fixtureStep(context.action, params, {
    world,
    scope,
    account,
    launcher: context.launcher,
  })
  try {
    await pause(context, FIXTURE_DELAYS.simulating)
    const before = step.check().gate
    if (!before.ok) {
      throw revertError(context.action, context.launcher, before.reason, step.args)
    }
    context.dispatch({ type: 'simulated' })
    await pause(context, FIXTURE_DELAYS.wallet)
    if (run.mode === 'reject' && step.failsOnDemand) {
      throw rejectionError()
    }
    hash = fixtureHash(context.action, Date.now())
    context.dispatch({ type: 'submitted', hash })
    context.report().onSubmitted(hash)
    await pause(context, pendingDelay(run.mode))
    const landing = step.check()
    if ((run.mode === 'revert' && step.failsOnDemand) || !landing.gate.ok) {
      throw revertError(
        context.action,
        context.launcher,
        plausibleRevert(context.action, landing.gate),
        step.args,
      )
    }
    await succeed(context, landing.apply(), hash)
  } catch (error) {
    failWith(context, error, hash)
  }
}
