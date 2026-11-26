import type { ActionParams } from '@/contracts/tx/actions'
import type { TxErrorInfo } from '@/contracts/tx/classify-error'
import type { TxState } from '@/contracts/tx/lifecycle'
import type { ActionOutcomes } from '@/contracts/tx/outcome'
import type { TxMessage } from '@/copy/tx'
import type { LauncherActionName } from '@/lib/actions'
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

export type ActionInput<Name extends LauncherActionName> = ActionParams[Name] & {
  readonly launcher: Address
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
  action: LauncherActionName,
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

export const useAction = <Name extends LauncherActionName>(
  action: Name,
  input: ActionInput<Name>,
): Action => {
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
    ensureNetwork: async () =>
      wallet.status !== 'wrongNetwork' || (await wallet.switchNetwork()).ok,
    onSubmitted: (hash: Hash) => {
      clearSent()
      sentToast.current = txToasts.push(toastOf('info', TX_COPY.submitted, hash))
    },
    onSuccess: (outcome: ActionOutcomes[Name] | null, hash: Hash) => {
      clearSent()
      txToasts.push(toastOf('ok', successMessage(action, outcome, context), hash))
    },
    onFailure: (error: TxErrorInfo, hash: Hash | undefined) => {
      clearSent()
      const kind = error.tone === 'info' ? 'info' : 'err'
      txToasts.push(toastOf(kind, errorMessage(action, error, errorValues(context)), hash))
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
    run: () => {
      if (needsConnect) {
        wallet.connect()
        return
      }
      tx.run(input)
    },
  }
}
