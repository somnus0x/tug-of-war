import type { SendStage } from './use-send-create'
import type { CreateLimits } from '@/contracts/create-types'
import type { CreateCalls } from '@/contracts/queries/use-create-queries'
import type { TxState } from '@/contracts/tx/lifecycle'
import type { TxMessage } from '@/copy/tx'
import type { ToastKind } from '@/ui/toast-store'
import type { Hash } from 'viem'

import { explorerTxUrl } from '@/contracts/tx/explorer'
import { NOT_TAKEN } from '@/copy/error-rows'
import { TX_COPY } from '@/copy/tx'
import { txToasts } from '@/features/tx/tx-toasts'

export const messageText = (message: TxMessage): string =>
  (message.body === undefined ? message.title : `${message.title} ${message.body}`)
    .replace(NOT_TAKEN, '')
    .trim()

export const toast = (kind: ToastKind, message: TxMessage, hash?: Hash): number =>
  txToasts.push({
    kind,
    title: message.title,
    ...(message.body === undefined ? {} : { body: message.body }),
    ...(hash === undefined ? {} : { link: { href: explorerTxUrl(hash), label: TX_COPY.explorer } }),
  })

export const sendStageOf = <Outcome>(checking: boolean, state: TxState<Outcome>): SendStage => {
  if (state.stage === 'simulating' || state.stage === 'wallet') {
    return 'wallet'
  }
  if (state.stage === 'pending') {
    return 'pending'
  }
  return checking ? 'checking' : 'idle'
}

export const freshLimits = async (calls: CreateCalls): Promise<CreateLimits | null> => {
  try {
    return await calls.readLimits()
  } catch {
    return null
  }
}
