import type { PreSendResult } from './pre-send'
import type { TxMessage } from '@/copy/tx'
import type { BnbWei } from '@/lib/units'

import { CREATE_COPY } from '@/copy/create'

export type BlockedResult = Exclude<PreSendResult, { ok: true }>

export type AttemptEnd = 'sent' | 'stale' | 'blocked' | 'feeChanged' | 'failed'

export type AttemptDeps = {
  readonly checks: () => Promise<PreSendResult>
  readonly isCurrent: () => boolean
  readonly shownFee: BnbWei
  readonly send: (fee: BnbWei) => void
  readonly blocked: (result: BlockedResult) => void
  readonly feeChanged: (fee: BnbWei) => void
  readonly readFailed: () => void
}

export const runSendAttempt = async (deps: AttemptDeps): Promise<AttemptEnd> => {
  let result: PreSendResult
  try {
    result = await deps.checks()
  } catch {
    if (!deps.isCurrent()) {
      return 'stale'
    }
    deps.readFailed()
    return 'failed'
  }
  if (!deps.isCurrent()) {
    return 'stale'
  }
  if (!result.ok) {
    deps.blocked(result)
    return 'blocked'
  }
  if (result.fee !== deps.shownFee) {
    deps.feeChanged(result.fee)
    return 'feeChanged'
  }
  deps.send(result.fee)
  return 'sent'
}

export const reasonAppliesTo = (attemptKey: string, liveKey: string | null): boolean =>
  liveKey !== null && attemptKey === liveKey

export type SendFailure = { readonly key: string; readonly message: TxMessage }

export type FailureStage = 'simulation' | 'reverted'

export type FailureInput = {
  readonly kind: 'rejected' | 'insufficientFunds' | 'contract' | 'unknown'
  readonly stage: FailureStage
  readonly reasonText: string | null
  readonly onField: boolean
  readonly mapped: TxMessage
}

export const failureStageOf = (hash: string | undefined): FailureStage =>
  hash === undefined ? 'simulation' : 'reverted'

export const failureMessageOf = (input: FailureInput): TxMessage | null => {
  if (input.kind === 'rejected' || input.kind === 'insufficientFunds') {
    return null
  }
  if (input.kind === 'unknown') {
    return input.mapped
  }
  const reason = input.onField ? null : input.reasonText
  return input.stage === 'reverted'
    ? CREATE_COPY.sent.failed(reason)
    : CREATE_COPY.sent.notSent(reason)
}

export const sendFailedFor = (failure: SendFailure | null, liveKey: string | null): boolean =>
  failure !== null && liveKey !== null && failure.key === liveKey
