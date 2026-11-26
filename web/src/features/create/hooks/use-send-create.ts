import type { PreparedCreate } from '../model/config'
import type { CreatedResult } from '../model/created'
import type { BlockedResult, SendFailure } from '../model/send-attempt'
import type { CreateLimits, CreateSetup } from '@/contracts/create-types'
import type { CreateCalls } from '@/contracts/queries/use-create-queries'
import type { TxErrorInfo } from '@/contracts/tx/classify-error'
import type { TxMessage } from '@/copy/tx'
import type { BnbWei } from '@/lib/units'
import type { Address, Hash } from 'viem'

import { useEffect, useRef, useState } from 'react'

import { useTx } from '@/contracts/tx/use-tx'
import { CREATE_COPY } from '@/copy/create'
import { contractErrorMessage, errorMessage } from '@/copy/errors'
import { TX_COPY } from '@/copy/tx'
import { txToasts } from '@/features/tx/tx-toasts'
import { useWallet } from '@/features/wallet/use-wallet'
import { formatBnbExact, formatSpan } from '@/lib/format'

import { configKey } from '../model/config'
import { preSendChecks } from '../model/pre-send'
import { isFieldReason } from '../model/reason-field'
import { failureMessageOf, failureStageOf, runSendAttempt } from '../model/send-attempt'
import { floorText } from '../model/validate'
import { freshLimits, messageText, sendStageOf, toast } from './send-helpers'

export type SendCreate = (prepared: PreparedCreate) => void

export type SendStage = 'idle' | 'checking' | 'wallet' | 'pending'

export { sendStageOf } from './send-helpers'

export type ReportReason = (
  reason: string,
  limits: CreateLimits | null,
  attemptKey: string,
  showProblem: boolean,
) => void

export type CreateSender = {
  readonly send: SendCreate
  readonly stage: SendStage
  readonly fee: BnbWei
  readonly feeChangedFor: string | null
  readonly failure: SendFailure | null
}

export type SendInput = {
  readonly setup: CreateSetup
  readonly calls: CreateCalls
  readonly account: Address | undefined
  readonly onCreated: (result: CreatedResult) => void
  readonly onReason: ReportReason
}

const READ_FAILED: TxMessage = { title: CREATE_COPY.readFailed }

const FEE_REVERT = 'InvalidSaltLockPayment'

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
  const [feeChangedFor, setFeeChangedFor] = useState<string | null>(null)
  const [failure, setFailure] = useState<SendFailure | null>(null)
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

  const showFailure = (
    error: TxErrorInfo,
    hash: Hash | undefined,
    key: string | null,
    reasonText: string | null,
    onField: boolean,
  ): void => {
    const message = failureMessageOf({
      kind: error.kind,
      stage: failureStageOf(hash),
      reasonText,
      onField,
      mapped: errorMessage('createGame', error),
    })
    if (message === null) {
      toast('err', errorMessage('createGame', error), hash)
      return
    }
    toast('err', message, hash)
    if (key !== null) {
      setFailure({ key, message })
    }
  }

  const reportFailure = async (error: TxErrorInfo, hash: Hash | undefined): Promise<void> => {
    clearSent()
    const ticket = attempted.current
    if (error.kind !== 'contract' || error.name === undefined || ticket === null) {
      const text = error.kind === 'contract' ? messageText(errorMessage('createGame', error)) : null
      showFailure(error, hash, ticket?.key ?? null, text, false)
      return
    }
    const name = error.name
    const limits = await freshLimits(calls)
    const values = limits === null ? {} : { floor: floorText(limits.minRaiseFloor) }
    const text = errorMessage('createGame', error, values)
    if (ticket.id !== attempt.current) {
      if (hash !== undefined) {
        toast('err', text, hash)
      }
      return
    }
    latest.current.onReason(name, limits, ticket.key, false)
    if (name === FEE_REVERT) {
      await refreshFee(ticket)
    }
    showFailure(error, hash, ticket.key, messageText(text), isFieldReason(name))
  }

  const refreshFee = async (ticket: { id: number; key: string }): Promise<void> => {
    try {
      const fresh = await calls.readFee(setup.portal)
      if (ticket.id === attempt.current && fresh !== fee) {
        setFee(fresh)
        setFeeChangedFor(ticket.key)
      }
    } catch {
      return
    }
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

  const estimateCost = async (
    prepared: PreparedCreate,
    fresh: BnbWei,
    sender: Address,
  ): Promise<BnbWei | null> => {
    try {
      return await calls.estimateCreateCost({
        portal: setup.portal,
        factory: setup.factory,
        data: prepared.encoded,
        fee: fresh,
        account: sender,
      })
    } catch {
      return null
    }
  }

  const handleBlocked = (result: BlockedResult, key: string): void => {
    if (result.kind === 'unavailable') {
      latest.current.onReason('CreationFloorUnavailable', result.limits, key, false)
      toast('err', contractErrorMessage('createGame', 'CreationFloorUnavailable'))
    } else if (result.kind === 'salt') {
      latest.current.onReason('InvalidSalt', null, key, true)
      toast('err', contractErrorMessage('createGame', 'InvalidSalt'))
    } else if (result.kind === 'reason') {
      latest.current.onReason(result.reason, result.limits, key, true)
    } else {
      toast('err', CREATE_COPY.sent.balance(formatBnbExact(result.needed)))
    }
  }

  const check = async (prepared: PreparedCreate, sender: Address): Promise<void> => {
    attempt.current += 1
    const id = attempt.current
    const key = configKey(prepared.config)
    setChecking(true)
    setFeeChangedFor(null)
    setFailure(null)
    await runSendAttempt({
      checks: () =>
        preSendChecks(prepared, {
          readLimits: calls.readLimits,
          predictToken: calls.predictToken,
          validateConfig: calls.validateConfig,
          readFee: () => calls.readFee(setup.portal),
          readBalance: () => calls.readBalance(sender),
          estimateCost: (fresh) => estimateCost(prepared, fresh, sender),
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
        setFeeChangedFor(key)
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

  return { send, stage, fee, feeChangedFor, failure }
}
