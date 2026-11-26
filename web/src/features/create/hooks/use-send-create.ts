import type { PreparedCreate } from '../model/config'
import type { CreatedResult } from '../model/created'
import type { BlockedResult } from '../model/send-attempt'
import type { CreateLimits, CreateSetup } from '@/contracts/create-types'
import type { CreateCalls } from '@/contracts/queries/use-create-queries'
import type { TxErrorInfo } from '@/contracts/tx/classify-error'
import type { TxState } from '@/contracts/tx/lifecycle'
import type { TxMessage } from '@/copy/tx'
import type { BnbWei } from '@/lib/units'
import type { ToastKind } from '@/ui/toast-store'
import type { Address, Hash } from 'viem'

import { useEffect, useRef, useState } from 'react'

import { explorerTxUrl } from '@/contracts/tx/explorer'
import { useTx } from '@/contracts/tx/use-tx'
import { CREATE_COPY } from '@/copy/create'
import { contractErrorMessage, errorMessage } from '@/copy/errors'
import { TX_COPY } from '@/copy/tx'
import { txToasts } from '@/features/tx/tx-toasts'
import { useWallet } from '@/features/wallet/use-wallet'
import { formatBnbExact, formatSpan } from '@/lib/format'

import { configKey } from '../model/config'
import { preSendChecks } from '../model/pre-send'
import { runSendAttempt } from '../model/send-attempt'
import { floorText } from '../model/validate'

export type SendCreate = (prepared: PreparedCreate) => void

export type SendStage = 'idle' | 'checking' | 'wallet' | 'pending'

export type ReportReason = (reason: string, limits: CreateLimits | null, attemptKey: string) => void

export type CreateSender = {
  readonly send: SendCreate
  readonly stage: SendStage
  readonly fee: BnbWei
  readonly feeChanged: boolean
}

export type SendInput = {
  readonly setup: CreateSetup
  readonly calls: CreateCalls
  readonly account: Address | undefined
  readonly onCreated: (result: CreatedResult) => void
  readonly onReason: ReportReason
}

const READ_FAILED: TxMessage = { title: CREATE_COPY.readFailed }

const toast = (kind: ToastKind, message: TxMessage, hash?: Hash): number =>
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

const freshLimits = async (calls: CreateCalls): Promise<CreateLimits | null> => {
  try {
    return await calls.readLimits()
  } catch {
    return null
  }
}

export const useSendCreate = (input: SendInput): CreateSender => {
  const { setup, calls } = input
  const wallet = useWallet()
  const [checking, setChecking] = useState(false)
  const acceptWindow = useRef<number | null>(null)
  const latest = useRef(input)
  const busy = useRef(false)
  const attempt = useRef(0)
  const attempted = useRef<{ id: number; key: string } | null>(null)
  const [fee, setFee] = useState<BnbWei>(setup.fee)
  const [feeChanged, setFeeChanged] = useState(false)
  const account = input.account
  const network = `${wallet.status}|${wallet.chainName ?? ''}`

  const seen = useRef(`${account ?? ''}|${network}`)

  useEffect(() => {
    const now = `${account ?? ''}|${network}`
    if (seen.current !== now) {
      seen.current = now
      attempt.current += 1
    }
  })

  useEffect(
    () => () => {
      attempt.current += 1
    },
    [],
  )
  const sentToast = useRef<number | null>(null)

  const clearSent = (): void => {
    if (sentToast.current !== null) {
      txToasts.dismiss(sentToast.current)
      sentToast.current = null
    }
  }

  useEffect(() => {
    latest.current = input
  })

  const reportFailure = async (error: TxErrorInfo, hash: Hash | undefined): Promise<void> => {
    clearSent()
    if (error.kind !== 'contract' || error.name === undefined) {
      toast('err', errorMessage('createGame', error), hash)
      return
    }
    const ticket = attempted.current
    if (ticket === null) {
      return
    }
    const limits = await freshLimits(calls)
    if (ticket.id !== attempt.current) {
      return
    }
    latest.current.onReason(error.name, limits, ticket.key)
    const values = limits === null ? {} : { floor: floorText(limits.minRaiseFloor) }
    toast('err', errorMessage('createGame', error, values), hash)
  }

  const tx = useTx('createGame', {
    launcher: setup.factory,
    target: setup.portal,
    ensureNetwork: async () =>
      wallet.status !== 'wrongNetwork' || (await wallet.switchNetwork()).ok,
    onSubmitted: (hash) => {
      clearSent()
      sentToast.current = toast('info', TX_COPY.submitted, hash)
    },
    onSuccess: (outcome, hash) => {
      clearSent()
      const seconds = acceptWindow.current
      toast(
        'ok',
        outcome === null
          ? CREATE_COPY.sent.missing
          : CREATE_COPY.sent.created(seconds === null ? null : formatSpan(seconds)),
        hash,
      )
      latest.current.onCreated({ game: outcome, hash })
    },
    onFailure: (error, hash) => {
      void reportFailure(error, hash)
    },
  })

  const stage = sendStageOf(checking, tx.state)

  const handleBlocked = (result: BlockedResult, key: string): void => {
    if (result.kind === 'unavailable') {
      toast('err', contractErrorMessage('createGame', 'CreationFloorUnavailable'))
    } else if (result.kind === 'salt') {
      latest.current.onReason('InvalidSalt', null, key)
      toast('err', contractErrorMessage('createGame', 'InvalidSalt'))
    } else if (result.kind === 'reason') {
      latest.current.onReason(result.reason, result.limits, key)
    } else {
      toast('err', CREATE_COPY.sent.balance(formatBnbExact(result.needed)))
    }
  }

  const check = async (prepared: PreparedCreate, sender: Address): Promise<void> => {
    attempt.current += 1
    const id = attempt.current
    const key = configKey(prepared.config)
    setChecking(true)
    setFeeChanged(false)
    await runSendAttempt({
      checks: () =>
        preSendChecks(prepared, {
          readLimits: calls.readLimits,
          predictToken: calls.predictToken,
          validateConfig: calls.validateConfig,
          readFee: () => calls.readFee(setup.portal),
          readBalance: () => calls.readBalance(sender),
        }),
      isCurrent: () => attempt.current === id,
      shownFee: fee,
      send: (sentFee) => {
        acceptWindow.current = prepared.config.acceptWindow
        attempted.current = { id, key }
        tx.run({ factory: setup.factory, data: prepared.encoded, fee: sentFee })
      },
      blocked: (result) => {
        handleBlocked(result, key)
      },
      feeChanged: (fresh) => {
        setFee(fresh)
        setFeeChanged(true)
      },
      readFailed: () => {
        toast('err', READ_FAILED)
      },
    })
    busy.current = false
    setChecking(false)
  }

  const send: SendCreate = (prepared) => {
    const sender = latest.current.account
    if (busy.current || stage !== 'idle' || sender === undefined) {
      return
    }
    busy.current = true
    void check(prepared, sender)
  }

  return { send, stage, fee, feeChanged }
}
