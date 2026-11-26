import type { PreSendResult } from './pre-send'
import type { BnbWei } from '@/lib/units'

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
