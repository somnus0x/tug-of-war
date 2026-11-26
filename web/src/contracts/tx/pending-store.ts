import type { TxActionName } from '@/lib/actions'
import type { Address, Hash } from 'viem'

import { isAddress, isHash } from 'viem'

import { TX_ACTIONS } from '@/lib/actions'

export type PendingTx = {
  readonly hash: Hash
  readonly action: TxActionName
  readonly launcher: Address
  readonly account: Address
  readonly chainId: number
}

export type PendingQuery = Omit<PendingTx, 'hash'>

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const PENDING_KEY = 'tug.pending-tx'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isAction = (value: unknown): value is TxActionName =>
  TX_ACTIONS.some((name) => name === value)

const isPendingTx = (value: unknown): value is PendingTx =>
  isRecord(value) &&
  typeof value['hash'] === 'string' &&
  isHash(value['hash']) &&
  isAction(value['action']) &&
  typeof value['launcher'] === 'string' &&
  isAddress(value['launcher'], { strict: false }) &&
  typeof value['account'] === 'string' &&
  isAddress(value['account'], { strict: false }) &&
  typeof value['chainId'] === 'number'

const sameAddress = (a: Address, b: Address): boolean => a.toLowerCase() === b.toLowerCase()

const matches = (entry: PendingQuery, query: PendingQuery): boolean =>
  entry.action === query.action &&
  entry.chainId === query.chainId &&
  sameAddress(entry.launcher, query.launcher) &&
  sameAddress(entry.account, query.account)

const parse = (text: string | null): PendingTx[] => {
  if (text === null) {
    return []
  }
  try {
    const value: unknown = JSON.parse(text)
    return Array.isArray(value) ? value.filter(isPendingTx) : []
  } catch {
    return []
  }
}

export type PendingStore = {
  readonly find: (query: PendingQuery) => PendingTx | undefined
  readonly save: (entry: PendingTx) => void
  readonly replace: (from: Hash, to: Hash) => void
  readonly remove: (hash: Hash) => void
}

export const createPendingStore = (storage: () => KeyValueStorage | undefined): PendingStore => {
  const read = (): PendingTx[] => {
    try {
      return parse(storage()?.getItem(PENDING_KEY) ?? null)
    } catch {
      return []
    }
  }
  const write = (entries: readonly PendingTx[]): void => {
    try {
      const target = storage()
      if (entries.length === 0) {
        target?.removeItem(PENDING_KEY)
      } else {
        target?.setItem(PENDING_KEY, JSON.stringify(entries))
      }
    } catch {
      return
    }
  }
  return {
    find: (query) => read().find((entry) => matches(entry, query)),
    save: (entry) => {
      write([...read().filter((item) => !matches(item, entry)), entry])
    },
    replace: (from, to) => {
      write(
        read().map((entry) =>
          entry.hash === from
            ? {
                hash: to,
                action: entry.action,
                launcher: entry.launcher,
                account: entry.account,
                chainId: entry.chainId,
              }
            : entry,
        ),
      )
    },
    remove: (hash) => {
      write(read().filter((entry) => entry.hash !== hash))
    },
  }
}

export const browserSessionStorage = (): KeyValueStorage | undefined => {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage
  } catch {
    return undefined
  }
}
