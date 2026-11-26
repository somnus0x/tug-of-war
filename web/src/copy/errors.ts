import type { ErrorValues, Row } from './error-rows'
import type { TxMessage } from './tx'
import type { ActionName } from '@/lib/actions'

import { ERROR_ROWS, NOT_TAKEN } from './error-rows'
import { TX_COPY } from './tx'

export type { ErrorValues } from './error-rows'

export type ErrorInput = {
  readonly kind: 'rejected' | 'insufficientFunds' | 'contract' | 'unknown'
  readonly name?: string
  readonly selector?: string
  readonly message?: string
}

export const REJECTED: TxMessage = { title: 'Transaction rejected', body: 'Nothing was sent.' }

export const INSUFFICIENT_GAS: TxMessage = { title: 'Not enough BNB for the network fee.' }

const findRow = (action: ActionName, name: string): Row | undefined => {
  const rows = Object.hasOwn(ERROR_ROWS, name) ? ERROR_ROWS[name] : undefined
  return (
    rows?.find((row) => row.actions !== 'any' && row.actions.includes(action)) ??
    rows?.find((row) => row.actions === 'any')
  )
}

export const hasErrorMessage = (action: ActionName, name: string): boolean =>
  findRow(action, name) !== undefined

export const fallbackMessage = (action: ActionName, detail: string): TxMessage => ({
  title: `${TX_COPY.actionLabel(action)} did not go through`,
  body: `${detail.replace(/\.$/, '')}. ${NOT_TAKEN}`,
})

export const contractErrorMessage = (
  action: ActionName,
  name: string,
  values: ErrorValues = {},
): TxMessage => {
  const row = findRow(action, name)
  return row === undefined ? fallbackMessage(action, name) : row.message(values, name)
}

export const errorMessage = (
  action: ActionName,
  error: ErrorInput,
  values: ErrorValues = {},
): TxMessage => {
  if (error.kind === 'rejected') {
    return REJECTED
  }
  if (error.kind === 'insufficientFunds') {
    return INSUFFICIENT_GAS
  }
  if (error.name !== undefined) {
    return contractErrorMessage(action, error.name, values)
  }
  return fallbackMessage(action, error.selector ?? error.message ?? 'Something went wrong')
}
