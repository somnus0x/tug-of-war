import type { FieldName } from './form-values'
import type { CreateLimits } from '@/contracts/create-types'
import type { ErrorValues } from '@/copy/errors'
import type { TxMessage } from '@/copy/tx'

import { contractErrorMessage } from '@/copy/errors'
import { formatSpan } from '@/lib/format'

import { floorText } from './validate'

export type ReasonProblem =
  | { readonly kind: 'field'; readonly field: FieldName; readonly text: string }
  | { readonly kind: 'form'; readonly message: TxMessage }

const FIELD_OF_REASON: Readonly<Record<string, FieldName>> = {
  InvalidCaptains: 'captainRed',
  DurationOutOfRange: 'duration',
  AcceptWindowOutOfRange: 'acceptWindow',
  InvalidWalletCap: 'walletCap',
  CaptainDepositExceedsWalletCap: 'captainMinDeposit',
  ZeroMinRaise: 'minRaise',
  MinRaiseBelowCreationFloor: 'minRaise',
}

const valuesFor = (reason: string, limits: CreateLimits): ErrorValues => {
  if (reason === 'DurationOutOfRange') {
    return { min: formatSpan(limits.duration.min), max: formatSpan(limits.duration.max) }
  }
  if (reason === 'AcceptWindowOutOfRange') {
    return { min: formatSpan(limits.acceptWindow.min), max: formatSpan(limits.acceptWindow.max) }
  }
  if (reason === 'MinRaiseBelowCreationFloor') {
    return { floor: floorText(limits.minRaiseFloor) }
  }
  return {}
}

export const reasonProblem = (reason: string, limits: CreateLimits): ReasonProblem => {
  const message = contractErrorMessage('createGame', reason, valuesFor(reason, limits))
  const field = Object.hasOwn(FIELD_OF_REASON, reason) ? FIELD_OF_REASON[reason] : undefined
  return field === undefined
    ? { kind: 'form', message }
    : { kind: 'field', field, text: message.title }
}
