import type { ActionParams } from '@/contracts/tx/actions'
import type { TxErrorInfo } from '@/contracts/tx/classify-error'
import type { TxState } from '@/contracts/tx/lifecycle'
import type { ActionOutcomes } from '@/contracts/tx/outcome'
import type { TxMessage } from '@/copy/tx'
import type { TxActionName } from '@/lib/actions'
import type { TileState } from '@/ui/tile-button-classes'
import type { ToastInput, ToastKind } from '@/ui/toast-store'
import type { Address, Hash } from 'viem'

import { useRef } from 'react'

import {
  useGame,
  usePlayer,
  useRules,
  useViewerAccount,
} from '@/contracts/queries/use-game-queries'
import { FIXTURES_ON } from '@/contracts/source'
import { explorerTxUrl } from '@/contracts/tx/explorer'
import { useTx } from '@/contracts/tx/use-tx'
import { errorMessage } from '@/copy/errors'
import { TX_COPY } from '@/copy/tx'
import { WALLET_COPY } from '@/copy/wallet'
import { useWallet } from '@/features/wallet/use-wallet'

import { errorValues, successMessage } from './tx-messages'
import { txToasts } from './tx-toasts'

export type ActionInput<Name extends TxActionName> = ActionParams[Name] & {
  readonly launcher: Address
  readonly target?: Address | undefined
}

export type Action = {
  readonly state: TileState
  readonly label: string | undefined
  readonly run: () => void
}

export const tileStateOf = <Outcome>(state: TxState<Outcome>): TileState => {
  if (state.stage === 'simulating' || state.stage === 'wallet') {
    return 'wallet'
  }
  return state.stage === 'pending' ? 'pending' : 'idle'
}

export const progressLabel = <Outcome>(
  action: TxActionName,
  state: TxState<Outcome>,
): string | undefined => {
  switch (state.stage) {
    case 'simulating':
      return TX_COPY.preparing
    case 'wallet':
      return TX_COPY.wallet
    case 'pending':
      return state.checking ? TX_COPY.checking : TX_COPY.progress(action)
    default:
      return undefined
  }
}

const toastOf = (kind: ToastKind, message: TxMessage, hash: Hash | undefined): ToastInput => ({
  kind,
  title: message.title,
  ...(message.body === undefined ? {} : { body: message.body }),
  ...(hash === undefined ? {} : { link: { href: explorerTxUrl(hash), label: TX_COPY.explorer } }),
})

export type ActionOptions = {
  readonly onSuccess?: () => void
  readonly onQuietInfo?: () => void
  readonly onFailure?: () => void
}

export type ActionPlace = {
  readonly launcher: Address
  readonly target?: Address | undefined
}

export type ParamAction<Name extends TxActionName> = {
  readonly state: TileState
  readonly label: string | undefined
  readonly run: (params: ActionParams[Name]) => void
}

export const useActionWith = <Name extends TxActionName>(
  action: Name,
  input: ActionPlace,
  options: ActionOptions = {},
): ParamAction<Name> => {
  const wallet = useWallet()
  const account = useViewerAccount(wallet.address)
  const game = useGame(input.launcher).data?.game
  const rules = useRules(input.launcher).data
  const player = usePlayer(input.launcher, account).data?.player
  const sentToast = useRef<number | null>(null)
  const context = { game, player, rules }

  const clearSent = (): void => {
    if (sentToast.current !== null) {
      txToasts.dismiss(sentToast.current)
      sentToast.current = null
    }
  }

  const tx = useTx(action, {
    launcher: input.launcher,
    target: input.target,
    ensureNetwork: async () =>
      wallet.status !== 'wrongNetwork' || (await wallet.switchNetwork()).ok,
    onSubmitted: (hash: Hash) => {
      clearSent()
      sentToast.current = txToasts.push(toastOf('info', TX_COPY.submitted, hash))
    },
    onSuccess: (outcome: ActionOutcomes[Name] | null, hash: Hash) => {
      clearSent()
      txToasts.push(toastOf('ok', successMessage(action, outcome, context), hash))
      options.onSuccess?.()
    },
    onFailure: (error: TxErrorInfo, hash: Hash | undefined) => {
      clearSent()
      if (error.tone === 'info' && options.onQuietInfo !== undefined) {
        options.onQuietInfo()
        return
      }
      const kind = error.tone === 'info' ? 'info' : 'err'
      txToasts.push(toastOf(kind, errorMessage(action, error, errorValues(context)), hash))
      options.onFailure?.()
    },
  })

  const needsConnect = !FIXTURES_ON && wallet.status === 'disconnected'
  const state = tileStateOf(tx.state)
  const progress = progressLabel(action, tx.state)
  const idleLabel = needsConnect
    ? WALLET_COPY.connect
    : wallet.status === 'wrongNetwork' && !FIXTURES_ON
      ? TX_COPY.switchNetwork
      : undefined

  return {
    state,
    label: progress ?? idleLabel,
    run: (params) => {
      if (needsConnect) {
        wallet.connect()
        return
      }
      tx.run(params)
    },
  }
}

export const useAction = <Name extends TxActionName>(
  action: Name,
  input: ActionInput<Name>,
  options: ActionOptions = {},
): Action => {
  const runner = useActionWith(action, input, options)
  return {
    state: runner.state,
    label: runner.label,
    run: () => {
      runner.run(input)
    },
  }
}
