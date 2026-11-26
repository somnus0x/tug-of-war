import type { KeyValueStorage, PendingTx } from './pending-store'
import type { Hash } from 'viem'

import { describe, expect, it } from 'vitest'

import { PENDING_KEY, createPendingStore } from './pending-store'

const memoryStorage = (): KeyValueStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

const HASH_A: Hash = `0x${'a'.repeat(64)}`
const HASH_B: Hash = `0x${'b'.repeat(64)}`

const ENTRY: PendingTx = {
  hash: HASH_A,
  action: 'contribute',
  launcher: '0x00000000000000000000000000000000000000A1',
  account: '0x0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c',
  chainId: 97,
}

const QUERY = {
  action: ENTRY.action,
  launcher: '0x00000000000000000000000000000000000000a1',
  account: ENTRY.account,
  chainId: 97,
} as const

describe('pending store', () => {
  it('saves, finds by action, launcher, account and chain, and removes', () => {
    const storage = memoryStorage()
    const store = createPendingStore(() => storage)
    store.save(ENTRY)
    expect(store.find(QUERY)).toEqual(ENTRY)
    expect(store.find({ ...QUERY, action: 'launch' })).toBeUndefined()
    expect(store.find({ ...QUERY, chainId: 56 })).toBeUndefined()
    store.remove(HASH_A)
    expect(store.find(QUERY)).toBeUndefined()
    expect(storage.data.has(PENDING_KEY)).toBe(false)
  })

  it('follows a replacement hash', () => {
    const store = createPendingStore(memoryStorage)
    const storage = memoryStorage()
    const shared = createPendingStore(() => storage)
    shared.save(ENTRY)
    shared.replace(HASH_A, HASH_B)
    expect(shared.find(QUERY)?.hash).toBe(HASH_B)
    expect(store.find(QUERY)).toBeUndefined()
  })

  it('keeps one entry per action and wallet', () => {
    const storage = memoryStorage()
    const store = createPendingStore(() => storage)
    store.save(ENTRY)
    store.save({ ...ENTRY, hash: HASH_B })
    expect(JSON.parse(storage.data.get(PENDING_KEY) ?? '[]')).toHaveLength(1)
  })

  it('ignores broken data', () => {
    const storage = memoryStorage()
    storage.setItem(PENDING_KEY, '{not json')
    expect(createPendingStore(() => storage).find(QUERY)).toBeUndefined()
    storage.setItem(PENDING_KEY, JSON.stringify([{ hash: 'nope' }]))
    expect(createPendingStore(() => storage).find(QUERY)).toBeUndefined()
  })

  it('works without storage and when storage throws', () => {
    const missing = createPendingStore(() => undefined)
    missing.save(ENTRY)
    expect(missing.find(QUERY)).toBeUndefined()
    const throwing = createPendingStore(() => ({
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }))
    expect(() => {
      throwing.save(ENTRY)
    }).not.toThrow()
    expect(throwing.find(QUERY)).toBeUndefined()
  })
})
