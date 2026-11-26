import type { LogClient, StartBlockStore } from './chain-logs'
import type { GameLog } from './logs'

import { describe, expect, it } from 'vitest'

import {
  BACKOFF_MS,
  LOG_WINDOW_MAX,
  RETRIES_PER_WINDOW,
  classifyLogError,
  createChainLogReader,
  findBlockAtOrAfter,
} from './chain-logs'

const LAUNCHER = '0x0000000000000000000000000000000000000001'

type Call = readonly [bigint, bigint]

type Failure = (from: bigint, to: bigint, attempt: number) => Error | null

const timeOf = (block: bigint): number => 1000 + Number(block) * 3

const clientWith = (latest: bigint, fail: Failure = () => null) => {
  const calls: Call[] = []
  const timeReads: bigint[] = []
  const client: LogClient = {
    latestBlock: () => Promise.resolve(latest),
    blockTime: (block) => {
      timeReads.push(block)
      return Promise.resolve(timeOf(block))
    },
    logsIn: (_launcher, from, to) => {
      calls.push([from, to])
      const error = fail(from, to, calls.length)
      if (error !== null) {
        return Promise.reject(error)
      }
      const log: GameLog = {
        id: `${from}`,
        txHash: `0x${from.toString(16).padStart(64, '0')}`,
        blockNumber: from,
        logIndex: 0,
        kind: 'overtime',
        extensionsUsed: 1,
      }
      return Promise.resolve([log])
    },
  }
  return { client, calls, timeReads }
}

const memoryStore = (): StartBlockStore & { values: Map<string, bigint> } => {
  const values = new Map<string, bigint>()
  return { values, get: (key) => values.get(key), set: (key, block) => values.set(key, block) }
}

const sleeps: number[] = []
const options = {
  sleep: (ms: number) => {
    sleeps.push(ms)
    return Promise.resolve()
  },
}

const CREATED_BLOCK = 40n
const request = { fromBlock: null, startHint: undefined, createdAt: timeOf(CREATED_BLOCK) }

const rangeError =
  (max: bigint): Failure =>
  (from, to) =>
    to - from + 1n > max ? new Error('eth_getLogs block range too large, max 1000') : null

describe('chain log reader', () => {
  it('reads in windows of at most 5,000 blocks up to the latest block', async () => {
    const { client, calls } = clientWith(12_000n)
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    const result = await reader.readLogs(LAUNCHER, { ...request, fromBlock: 1000n })
    expect(calls).toEqual([
      [1000n, 5999n],
      [6000n, 10_999n],
      [11_000n, 12_000n],
    ])
    expect(result.fromBlock).toBe(1000n)
    expect(result.toBlock).toBe(12_000n)
    expect(result.caughtUp).toBe(true)
  })

  it('halves the span it queried on a range error', async () => {
    const { client, calls } = clientWith(3000n, rangeError(1000n))
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    await reader.readLogs(LAUNCHER, { ...request, fromBlock: 1n })
    expect(calls.slice(0, 3)).toEqual([
      [1n, 3000n],
      [1n, 1500n],
      [1n, 750n],
    ])
    expect(calls.at(-1)?.[1]).toBe(3000n)
  })

  it('does not repeat a failing request when the span is already at the minimum', async () => {
    const { client, calls } = clientWith(100n, () => new Error('block range too large'))
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    await expect(reader.readLogs(LAUNCHER, { ...request, fromBlock: 100n })).rejects.toThrow(
      'block range',
    )
    expect(calls).toEqual([[100n, 100n]])
  })

  it('grows the window back after successful reads', async () => {
    let limited = true
    const { client } = clientWith(1_000_000n, (from, to) =>
      limited && to - from + 1n > 1000n ? new Error('block range too large') : null,
    )
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    await reader.readLogs(LAUNCHER, { ...request, fromBlock: 1n })
    expect(reader.windowSize()).toBeLessThan(LOG_WINDOW_MAX)
    limited = false
    await reader.readLogs(LAUNCHER, { ...request, fromBlock: 1n })
    await reader.readLogs(LAUNCHER, { ...request, fromBlock: 1n })
    expect(reader.windowSize()).toBe(LOG_WINDOW_MAX)
  })

  it('keeps the window size and backs off on a rate limit, then succeeds', async () => {
    sleeps.length = 0
    const { client, calls } = clientWith(4000n, (_from, _to, attempt) =>
      attempt === 1 ? new Error('HTTP 429 Too Many Requests') : null,
    )
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    const result = await reader.readLogs(LAUNCHER, { ...request, fromBlock: 1n })
    expect(calls).toEqual([
      [1n, 4000n],
      [1n, 4000n],
    ])
    expect(sleeps).toEqual([BACKOFF_MS])
    expect(reader.windowSize()).toBe(LOG_WINDOW_MAX)
    expect(result.caughtUp).toBe(true)
  })

  it('keeps the windows that succeeded when a later one keeps failing', async () => {
    sleeps.length = 0
    const { client, calls } = clientWith(12_000n, (from) =>
      from >= 6000n ? new Error('fetch failed: socket hang up') : null,
    )
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    const result = await reader.readLogs(LAUNCHER, { ...request, fromBlock: 1000n })
    expect(result.logs.map((log) => log.blockNumber)).toEqual([1000n])
    expect(result.toBlock).toBe(5999n)
    expect(result.caughtUp).toBe(false)
    expect(result.hasMore).toBe(false)
    expect(calls).toHaveLength(2 + RETRIES_PER_WINDOW)
    expect(sleeps).toEqual([BACKOFF_MS, BACKOFF_MS * 2])
  })

  it('fails the read when the first window cannot be read at all', async () => {
    const { client } = clientWith(100n, () => new Error('fetch failed'))
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    await expect(reader.readLogs(LAUNCHER, { ...request, fromBlock: 1n })).rejects.toThrow(
      'fetch failed',
    )
  })

  it('waits for the next poll when the node has not reached the block yet', async () => {
    sleeps.length = 0
    const { client, calls } = clientWith(10_000n, (from) =>
      from >= 5001n ? new Error('block range extends beyond current head block') : null,
    )
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    const result = await reader.readLogs(LAUNCHER, { ...request, fromBlock: 1n })
    expect(calls).toHaveLength(2)
    expect(sleeps).toEqual([])
    expect(result.toBlock).toBe(5000n)
    expect(result.caughtUp).toBe(false)
    expect(result.hasMore).toBe(false)
  })

  it('stops after a bounded number of windows and continues from there', async () => {
    const { client } = clientWith(1_000_000n)
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    const first = await reader.readLogs(LAUNCHER, { ...request, fromBlock: 1n })
    expect(first.caughtUp).toBe(false)
    expect(first.hasMore).toBe(true)
    expect(first.toBlock).toBe(120_000n)
  })

  it('finds the creation block by its timestamp once and caches it', async () => {
    const { client, timeReads } = clientWith(100n)
    const store = memoryStore()
    const reader = createChainLogReader(client, store, 97, options)
    const result = await reader.readLogs(LAUNCHER, request)
    expect(result.fromBlock).toBe(CREATED_BLOCK)
    expect([...store.values.values()]).toEqual([CREATED_BLOCK])
    const reads = timeReads.length
    await reader.readLogs(LAUNCHER, request)
    expect(timeReads).toHaveLength(reads)
  })

  it('uses a link hint that is at or before the creation block', async () => {
    const { client } = clientWith(100n)
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    const result = await reader.readLogs(LAUNCHER, { ...request, startHint: 38n })
    expect(result.fromBlock).toBe(38n)
  })

  it('ignores a link hint beyond the head and searches instead', async () => {
    const { client } = clientWith(100n)
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    const result = await reader.readLogs(LAUNCHER, { ...request, startHint: 1_000_000_000_000n })
    expect(result.fromBlock).toBe(CREATED_BLOCK)
    expect(result.caughtUp).toBe(true)
  })

  it('ignores a link hint whose block came after the game was created', async () => {
    const { client } = clientWith(100n)
    const reader = createChainLogReader(client, memoryStore(), 97, options)
    const result = await reader.readLogs(LAUNCHER, { ...request, startHint: 60n })
    expect(result.fromBlock).toBe(CREATED_BLOCK)
    expect(result.logs.map((log) => log.blockNumber)).toEqual([CREATED_BLOCK])
  })

  it('gives the first block at or after a timestamp', async () => {
    const { client } = clientWith(1000n)
    expect(await findBlockAtOrAfter(client, timeOf(7n), 1000n)).toBe(7n)
    expect(await findBlockAtOrAfter(client, timeOf(7n) - 1, 1000n)).toBe(7n)
    expect(await findBlockAtOrAfter(client, 0, 1000n)).toBe(0n)
  })
})

describe('classifyLogError', () => {
  it('tells range, rate, head and other errors apart', () => {
    expect(classifyLogError(new Error('query returned more than 10000 results'))).toBe('range')
    expect(classifyLogError(new Error('exceed maximum block range: 5000'))).toBe('range')
    expect(classifyLogError(new Error('rate limit exceeded'))).toBe('rate')
    expect(classifyLogError(new Error('outer', { cause: new Error('429') }))).toBe('rate')
    expect(classifyLogError(new Error('header not found'))).toBe('head')
    expect(classifyLogError(new Error('fetch failed'))).toBe('transient')
  })
})
