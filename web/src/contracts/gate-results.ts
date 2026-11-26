import type { GateName, MutableGates } from './gate-plan'
import type { Gate, Gates } from './types'
import type { ContractFunctionParameters } from 'viem'

import { BaseError, ContractFunctionRevertedError } from 'viem'

import { bnbWei } from '@/lib/units'

import { EMPTY_GATES } from './gate-plan'
import { mapGate, mapPreview } from './mappers'
import { isGateView, isPreviewView } from './view-guards'

export const READ_FAILED = 'ReadFailed'

export const failureReason = (error: unknown): string => {
  if (error instanceof BaseError) {
    const reverted = error.walk((cause) => cause instanceof ContractFunctionRevertedError)
    if (reverted instanceof ContractFunctionRevertedError && reverted.data !== undefined) {
      return reverted.data.errorName
    }
  }
  return READ_FAILED
}

export type Slot = GateName | 'preview' | 'autoLaunchQuote'

export type PlannedCall = { readonly slot: Slot; readonly call: ContractFunctionParameters }

export type CallResult =
  | { readonly status: 'success'; readonly result: unknown }
  | { readonly status: 'failure'; readonly error: unknown }

const gateFrom = (result: CallResult): Gate => {
  if (result.status === 'failure') {
    return { ok: false, reason: failureReason(result.error) }
  }
  return isGateView(result.result) ? mapGate(result.result) : { ok: false, reason: READ_FAILED }
}

export const assembleGates = (
  calls: readonly PlannedCall[],
  results: readonly CallResult[],
): Gates => {
  if (results.length > 0 && results.every((result) => result.status === 'failure')) {
    const first = results[0]
    throw new Error(
      `Every gate read failed: ${first === undefined ? READ_FAILED : failureReason(first)}`,
    )
  }
  const gates: MutableGates = { ...EMPTY_GATES }
  calls.forEach(({ slot }, index) => {
    const result = results[index]
    if (result === undefined) {
      return
    }
    if (slot === 'preview') {
      gates.preview =
        result.status === 'success' && isPreviewView(result.result)
          ? mapPreview(result.result)
          : null
      return
    }
    if (slot === 'autoLaunchQuote') {
      gates.autoLaunchQuote =
        result.status === 'success' && typeof result.result === 'bigint'
          ? bnbWei(result.result)
          : null
      return
    }
    gates[slot] = gateFrom(result)
  })
  return gates
}
