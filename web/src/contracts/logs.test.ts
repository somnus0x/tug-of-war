import type { ContributedLog, GameLog, LogBatch, LogState } from './logs'
import type { Hash } from 'viem'

import { describe, expect, it } from 'vitest'

import { bnbWei, bps, pullWei } from '@/lib/units'

import {
  REORG_DEPTH,
  blocksMissingTimes,
  logId,
  mergeLogBatch,
  isComparable,
  readFromAfter,
  startHintFromSearch,
} from './logs'

const txOf = (n: number): Hash => `0x${n.toString(16).padStart(64, '0')}`

const pullAt = (tx: number, block: number, index = 0): ContributedLog => ({
  id: logId(txOf(tx), index),
  txHash: txOf(tx),
  blockNumber: BigInt(block),
  logIndex: index,
  kind: 'contributed',
  account: '0xaaaa00000000000000000000000000000000aaaa',
  team: 'blue',
  amount: bnbWei(1n),
  pull: pullWei(1n),
  weightBps: bps(10_000),
})

const batch = (logs: GameLog[], fromBlock: number, toBlock: number, caughtUp = true): LogBatch => ({
  logs,
  fromBlock: BigInt(fromBlock),
  toBlock: BigInt(toBlock),
  caughtUp,
  hasMore: !caughtUp,
  times: {},
})

const ids = (state: LogState) => state.logs.map((log) => log.id)

describe('mergeLogBatch', () => {
  it('sorts by block and log index and keeps one copy of each log', () => {
    const first = mergeLogBatch(undefined, batch([pullAt(3, 9, 2), pullAt(1, 5, 1)], 0, 10))
    const second = mergeLogBatch(first, batch([pullAt(3, 9, 2), pullAt(2, 9, 0)], 6, 12))
    expect(ids(second)).toEqual([pullAt(1, 5, 1).id, pullAt(2, 9, 0).id, pullAt(3, 9, 2).id])
    expect(second.nextBlock).toBe(13n)
  })

  it('replaces the re-read blocks so a log that vanished in a reorg is dropped', () => {
    const before = mergeLogBatch(
      undefined,
      batch([pullAt(1, 4), pullAt(2, 20), pullAt(3, 22)], 0, 25),
    )
    const after = mergeLogBatch(before, batch([pullAt(3, 23)], 15, 26))
    expect(ids(after)).toEqual([pullAt(1, 4).id, pullAt(3, 23).id])
    expect(after.logs.at(-1)?.blockNumber).toBe(23n)
    expect(after.arrivals).toEqual([])
  })

  it('reports only logs that are new after the backfill finished', () => {
    const partial = mergeLogBatch(undefined, batch([pullAt(1, 5)], 0, 10, false))
    expect(partial.backfilled).toBe(false)
    const done = mergeLogBatch(partial, batch([pullAt(2, 11)], 11, 20))
    expect(done.arrivals).toEqual([])
    expect(done.backfilled).toBe(true)
    const tail = mergeLogBatch(done, batch([pullAt(2, 11), pullAt(3, 21)], 6, 22))
    expect(tail.arrivals).toEqual([pullAt(3, 21).id])
  })
})

describe('readFromAfter', () => {
  it('starts a full read without state and re-reads a trailing window after that', () => {
    expect(readFromAfter(undefined)).toBeNull()
    const state = mergeLogBatch(undefined, batch([], 0, 100))
    expect(readFromAfter(state)).toBe(101n - REORG_DEPTH)
    expect(readFromAfter(mergeLogBatch(undefined, batch([], 0, 3)))).toBe(0n)
  })
})

describe('blocksMissingTimes', () => {
  it('asks once for each block of the newest rows that has no time yet', () => {
    const logs = [
      pullAt(1, 10),
      pullAt(2, 11),
      pullAt(3, 11, 1),
      pullAt(4, 12),
      pullAt(5, 13),
      pullAt(6, 13, 1),
      pullAt(7, 14),
      pullAt(8, 15),
      pullAt(9, 15, 1),
    ]
    const state = {
      ...mergeLogBatch(undefined, batch(logs, 0, 20)),
      times: { '12': 1000, '14': 1010 },
    }
    expect(blocksMissingTimes(state, 8)).toEqual([11n, 13n, 15n])
    expect(blocksMissingTimes(state, 2)).toEqual([15n])
  })
})

describe('startHintFromSearch', () => {
  it('reads a positive block number and ignores anything else', () => {
    expect(startHintFromSearch('?fx=live-mid&b=123')).toBe(123n)
    expect(startHintFromSearch('?b=0')).toBeUndefined()
    expect(startHintFromSearch('?b=abc')).toBeUndefined()
  })
})

describe('isComparable', () => {
  it('compares the fold only with a game view read at or after the last log block', () => {
    const state = mergeLogBatch(undefined, batch([], 0, 101))
    expect(isComparable(100n, state)).toBe(false)
    expect(isComparable(101n, state)).toBe(true)
    expect(isComparable(105n, state)).toBe(true)
  })
})
