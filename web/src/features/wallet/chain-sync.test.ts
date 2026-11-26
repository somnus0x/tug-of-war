import { afterEach, describe, expect, it, vi } from 'vitest'

import { syncChain } from './chain-sync'

const TARGET = 97

const fakeStore = (start: number | undefined, wallet: number | undefined) => {
  let chainId = start
  const listeners = new Set<() => void>()
  const announced: number[] = []
  const set = (next: number): void => {
    chainId = next
    for (const listener of listeners) {
      listener()
    }
  }
  return {
    announced,
    set,
    listening: () => listeners.size,
    deps: {
      storeChainId: () => chainId,
      walletChainId: async () => wallet,
      announce: (next: number) => {
        announced.push(next)
        set(next)
      },
      watch: (onChange: () => void) => {
        listeners.add(onChange)
        return () => {
          listeners.delete(onChange)
        }
      },
      timeoutMs: 20,
    },
  }
}

describe('syncChain', () => {
  it('agrees at once when the store already has the chain', async () => {
    const store = fakeStore(TARGET, 56)
    await expect(syncChain(TARGET, store.deps)).resolves.toBe(true)
    expect(store.announced).toEqual([])
  })

  it('tells the store when the wallet is on the chain but no change event came', async () => {
    const store = fakeStore(56, TARGET)
    await expect(syncChain(TARGET, store.deps)).resolves.toBe(true)
    expect(store.announced).toEqual([TARGET])
    expect(store.listening()).toBe(0)
  })

  it('waits for a late change event from the wallet', async () => {
    const store = fakeStore(56, 56)
    const agreed = syncChain(TARGET, store.deps)
    setTimeout(() => {
      store.set(TARGET)
    }, 5)
    await expect(agreed).resolves.toBe(true)
    expect(store.announced).toEqual([])
    expect(store.listening()).toBe(0)
  })

  it('gives up when the store never reaches the chain', async () => {
    const store = fakeStore(56, 56)
    await expect(syncChain(TARGET, store.deps)).resolves.toBe(false)
    expect(store.listening()).toBe(0)
  })

  it('does not trust a wallet that cannot report its chain', async () => {
    const store = fakeStore(56, undefined)
    store.deps.walletChainId = async () => {
      throw new Error('no provider')
    }
    await expect(syncChain(TARGET, store.deps)).resolves.toBe(false)
    expect(store.announced).toEqual([])
  })
})

const silentStore = () => {
  const store = fakeStore(56, undefined)
  store.deps.walletChainId = () => new Promise<number | undefined>(() => undefined)
  store.deps.timeoutMs = 10_000
  return store
}

describe('syncChain with a wallet that never answers', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('agrees when the store reaches the chain later', async () => {
    vi.useFakeTimers()
    const store = silentStore()
    const agreed = syncChain(TARGET, store.deps)
    await vi.advanceTimersByTimeAsync(3000)
    store.set(TARGET)
    await expect(agreed).resolves.toBe(true)
    expect(store.listening()).toBe(0)
  })

  it('fails at the deadline when nothing changes', async () => {
    vi.useFakeTimers()
    const store = silentStore()
    let settled: boolean | undefined
    const watchResult = async (): Promise<void> => {
      settled = await syncChain(TARGET, store.deps)
    }
    void watchResult()
    await vi.advanceTimersByTimeAsync(9999)
    expect(settled).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toBe(false)
    expect(store.listening()).toBe(0)
  })
})
