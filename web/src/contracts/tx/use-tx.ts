import type { ActionParams } from './actions'
import type { TxEvent, TxState } from './lifecycle'
import type { ActionOutcomes } from './outcome'
import type { RunnerContext, TxReport } from './tx-runner'
import type { TxActionName } from '@/lib/actions'
import type { Address } from 'viem'

import { useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { useAccount, useConfig } from 'wagmi'

import { env } from '@/app/env'

import { useSourceScope } from '../queries/use-game-queries'
import { FIXTURES_ON, fixtureWorld, gameSource } from '../source'
import { fixtureModeFromSearch } from './fixture-tx'
import { IDLE, isBusy, txReducer } from './lifecycle'
import { browserSessionStorage, createPendingStore } from './pending-store'
import { walletScopedKeys } from './refresh'
import { followReceipt, runChainTx, runFixtureTx } from './tx-runner'

export type TxOptions<Name extends TxActionName> = TxReport<Name> & {
  readonly launcher: Address
  readonly target?: Address | undefined
  readonly ensureNetwork: () => Promise<boolean>
}

export type Tx<Name extends TxActionName> = {
  readonly state: TxState<ActionOutcomes[Name]>
  readonly run: (params: ActionParams[Name]) => void
  readonly reset: () => void
}

const CHAIN_ID = env.VITE_CHAIN_ID

const pendingStore = createPendingStore(browserSessionStorage)

export const useTx = <Name extends TxActionName>(
  action: Name,
  options: TxOptions<Name>,
): Tx<Name> => {
  const config = useConfig()
  const queryClient = useQueryClient()
  const wallet = useAccount()
  const scope = useSourceScope()
  const searchStr = useRouterState({
    select: (state) => (FIXTURES_ON ? state.location.searchStr : ''),
  })
  const [state, dispatch] = useReducer(
    (current: TxState<ActionOutcomes[Name]>, event: TxEvent<ActionOutcomes[Name]>) =>
      txReducer(current, event),
    IDLE,
  )
  const generation = useRef(0)
  const inFlight = useRef(false)
  const latest = useRef(options)
  const launcher = options.launcher
  const target = options.target
  const address = wallet.address
  const walletChainId = wallet.chainId

  useEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    if (!isBusy(state)) {
      inFlight.current = false
    }
  }, [state])

  const contextFor = useCallback(
    (ticket: number): RunnerContext<Name> => ({
      action,
      launcher,
      target,
      chainId: CHAIN_ID,
      queryClient,
      dispatch,
      alive: () => generation.current === ticket,
      report: () => latest.current,
    }),
    [action, launcher, target, queryClient],
  )

  useEffect(() => {
    const onAppChain = walletChainId === CHAIN_ID
    const entry =
      FIXTURES_ON || address === undefined || !onAppChain
        ? undefined
        : pendingStore.find({ action, launcher, account: address, chainId: CHAIN_ID })
    if (entry !== undefined && address !== undefined) {
      generation.current += 1
      dispatch({ type: 'resume', hash: entry.hash })
      void followReceipt(contextFor(generation.current), pendingStore, address, entry.hash)
    }
    return () => {
      generation.current += 1
      dispatch({ type: 'contextChanged' })
      if (!FIXTURES_ON) {
        for (const queryKey of walletScopedKeys(CHAIN_ID, launcher)) {
          void queryClient.invalidateQueries({ queryKey })
        }
      }
    }
  }, [action, launcher, address, walletChainId, contextFor, queryClient])

  const run = (params: ActionParams[Name]): void => {
    if (isBusy(state) || inFlight.current) {
      return
    }
    inFlight.current = true
    generation.current += 1
    const context = contextFor(generation.current)
    dispatch({ type: 'start' })
    if (FIXTURES_ON) {
      void runFixtureTx(
        context,
        {
          world: fixtureWorld,
          scope,
          account: gameSource.viewerAccount(address, scope),
          mode: fixtureModeFromSearch(searchStr),
        },
        params,
      )
      return
    }
    void runChainTx(
      context,
      { config, pending: pendingStore, ensureNetwork: options.ensureNetwork },
      params,
    )
  }

  const reset = (): void => {
    if (!isBusy(state)) {
      dispatch({ type: 'reset' })
    }
  }

  return { state, run, reset }
}
