import type { ActionName } from '@/lib/actions'
import type { Hex } from 'viem'

import {
  BaseError,
  ContractFunctionRevertedError,
  InsufficientFundsError,
  UserRejectedRequestError,
  decodeErrorResult,
  isHex,
} from 'viem'

import { errorAbi } from '../abis'
import { buildErrorSelectorTable } from '../selectors'

export type TxErrorKind = 'rejected' | 'insufficientFunds' | 'contract' | 'unknown'

export type TxTone = 'error' | 'info'

export type TxErrorInfo = {
  readonly kind: TxErrorKind
  readonly name?: string
  readonly selector?: Hex
  readonly message?: string
  readonly tone: TxTone
}

const USER_REJECTED_CODE = 4001

const MAX_DEPTH = 12

const INSUFFICIENT_FUNDS = /insufficient funds/i

const SELECTOR_LENGTH = 10

const INFO_ERRORS: Partial<Record<ActionName, readonly string[]>> = {
  launch: ['AlreadyLaunched'],
  scheduleAutoLaunch: ['AutoLaunchAlreadyScheduled'],
  cancel: ['GameCancelled', 'NotCancellable'],
}

export const selectorTable = buildErrorSelectorTable(errorAbi)

type Fields = Record<string, unknown>

const isFields = (value: unknown): value is Fields => typeof value === 'object' && value !== null

export const errorChain = (error: unknown): Fields[] => {
  const chain: Fields[] = []
  if (error instanceof BaseError) {
    error.walk((link) => {
      if (isFields(link) && chain.length < MAX_DEPTH) {
        chain.push(link)
      }
      return false
    })
    return chain
  }
  const seen = new Set<unknown>()
  let current: unknown = error
  while (isFields(current) && chain.length < MAX_DEPTH && !seen.has(current)) {
    seen.add(current)
    chain.push(current)
    current = current['cause']
  }
  return chain
}

const isRejection = (link: Fields): boolean =>
  link instanceof UserRejectedRequestError ||
  link['code'] === USER_REJECTED_CODE ||
  link['name'] === 'UserRejectedRequestError'

const isInsufficientFunds = (link: Fields): boolean => {
  if (link instanceof InsufficientFundsError || link['name'] === 'InsufficientFundsError') {
    return true
  }
  const message = link['details'] ?? link['message']
  return typeof message === 'string' && INSUFFICIENT_FUNDS.test(message)
}

const asRevertData = (value: unknown): Hex | undefined =>
  isHex(value, { strict: true }) && value.length >= SELECTOR_LENGTH ? value : undefined

const revertData = (link: Fields): Hex | undefined => {
  if (link instanceof ContractFunctionRevertedError && link.raw !== undefined) {
    return asRevertData(link.raw)
  }
  const data = link['data']
  return asRevertData(data) ?? (isFields(data) ? asRevertData(data['data']) : undefined)
}

const nameFromData = (data: Hex): { name?: string; selector: Hex } => {
  const selector = asRevertData(data.slice(0, SELECTOR_LENGTH).toLowerCase()) ?? data
  try {
    return { name: decodeErrorResult({ abi: errorAbi, data }).errorName, selector }
  } catch {
    const name = selectorTable.get(selector)
    return name === undefined ? { selector } : { name, selector }
  }
}

const decodedName = (chain: readonly Fields[]): { name?: string; selector?: Hex } | null => {
  for (const link of chain) {
    const data = revertData(link)
    if (data !== undefined) {
      return nameFromData(data)
    }
  }
  for (const link of chain) {
    if (link instanceof ContractFunctionRevertedError) {
      const name = link.data?.errorName
      if (name !== undefined && name !== 'Error' && name !== 'Panic') {
        return { name }
      }
      if (link.signature !== undefined) {
        return nameFromData(link.signature)
      }
    }
  }
  return null
}

const shortMessage = (error: unknown): string | undefined => {
  if (error instanceof BaseError) {
    return error.shortMessage
  }
  return error instanceof Error ? error.message : undefined
}

export const toneFor = (action: ActionName, name: string | undefined): TxTone =>
  name !== undefined && (INFO_ERRORS[action] ?? []).includes(name) ? 'info' : 'error'

export const contractError = (action: ActionName, name: string): TxErrorInfo => ({
  kind: 'contract',
  name,
  tone: toneFor(action, name),
})

export const classifyError = (error: unknown, action: ActionName): TxErrorInfo => {
  const chain = errorChain(error)
  if (chain.some(isRejection)) {
    return { kind: 'rejected', tone: 'error' }
  }
  const decoded = decodedName(chain)
  if (decoded !== null) {
    return {
      kind: 'contract',
      ...decoded,
      tone: toneFor(action, decoded.name),
    }
  }
  if (chain.some(isInsufficientFunds)) {
    return { kind: 'insufficientFunds', tone: 'error' }
  }
  const message = shortMessage(error)
  return message === undefined
    ? { kind: 'unknown', tone: 'error' }
    : { kind: 'unknown', message, tone: 'error' }
}
