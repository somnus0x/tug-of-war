import type { BnbWei, Bps, PullWei } from '@/lib/units'
import type { Address, Hash } from 'viem'

export type LogSide = 'blue' | 'red'

type LogPosition = {
  readonly id: string
  readonly txHash: Hash
  readonly blockNumber: bigint
  readonly logIndex: number
}

export type ContributedLog = LogPosition & {
  readonly kind: 'contributed'
  readonly account: Address
  readonly team: LogSide
  readonly amount: BnbWei
  readonly pull: PullWei
  readonly weightBps: Bps
}

export type CaptainDepositedLog = LogPosition & {
  readonly kind: 'captainDeposited'
  readonly account: Address
  readonly team: LogSide
  readonly amount: BnbWei
}

export type OvertimeLog = LogPosition & {
  readonly kind: 'overtime'
  readonly extensionsUsed: number
}

export type CancelledLog = LogPosition & {
  readonly kind: 'cancelled'
  readonly captain: Address
  readonly refunded: BnbWei
}

export type GameLog = ContributedLog | CaptainDepositedLog | OvertimeLog | CancelledLog

export type PullLog = ContributedLog | CaptainDepositedLog

export type LogRequest = {
  readonly fromBlock: bigint | null
  readonly startHint: bigint | undefined
  readonly createdAt: number
}

export type LogBatch = {
  readonly logs: readonly GameLog[]
  readonly fromBlock: bigint
  readonly toBlock: bigint
  readonly caughtUp: boolean
  readonly hasMore: boolean
  readonly times: Readonly<Record<string, number>>
}

export type LogState = {
  readonly logs: readonly GameLog[]
  readonly nextBlock: bigint
  readonly caughtUp: boolean
  readonly hasMore: boolean
  readonly backfilled: boolean
  readonly arrivals: readonly string[]
  readonly times: Readonly<Record<string, number>>
}

export const logId = (txHash: Hash, logIndex: number): string => `${txHash}:${logIndex}`

export const isPullLog = (log: GameLog): log is PullLog =>
  log.kind === 'contributed' || log.kind === 'captainDeposited'

export const blockKey = (blockNumber: bigint): string => blockNumber.toString()

export const compareLogs = (a: GameLog, b: GameLog): number => {
  if (a.blockNumber !== b.blockNumber) {
    return a.blockNumber < b.blockNumber ? -1 : 1
  }
  return a.logIndex - b.logIndex
}

export const REORG_DEPTH = 15n

export const readFromAfter = (state: LogState | undefined): bigint | null => {
  if (state === undefined) {
    return null
  }
  const from = state.nextBlock - REORG_DEPTH
  return from > 0n ? from : 0n
}

const isOutside = (log: GameLog, batch: LogBatch): boolean =>
  log.blockNumber < batch.fromBlock || log.blockNumber > batch.toBlock

export const mergeLogBatch = (state: LogState | undefined, batch: LogBatch): LogState => {
  const known = new Set((state?.logs ?? []).map((log) => log.id))
  const kept = (state?.logs ?? []).filter((log) => isOutside(log, batch))
  const keptIds = new Set(kept.map((log) => log.id))
  const fresh: GameLog[] = []
  for (const log of batch.logs) {
    if (!keptIds.has(log.id)) {
      keptIds.add(log.id)
      fresh.push(log)
    }
  }
  const backfilled = state?.backfilled === true || batch.caughtUp
  return {
    logs: [...kept, ...fresh].toSorted(compareLogs),
    nextBlock: batch.toBlock + 1n,
    caughtUp: batch.caughtUp,
    hasMore: batch.hasMore,
    backfilled,
    arrivals:
      state?.backfilled === true
        ? fresh.filter((log) => !known.has(log.id)).map((log) => log.id)
        : [],
    times: { ...state?.times, ...batch.times },
  }
}

export const withTimes = (state: LogState, times: Readonly<Record<string, number>>): LogState =>
  Object.keys(times).length === 0 ? state : { ...state, times: { ...state.times, ...times } }

export const FEED_ROWS_MAX = 8

export const blocksMissingTimes = (state: LogState, rows: number): bigint[] => {
  const recent = state.logs.filter(isPullLog).slice(-rows)
  const missing = recent
    .map((log) => log.blockNumber)
    .filter((block) => state.times[blockKey(block)] === undefined)
  return [...new Set(missing)]
}

export const startHintFromSearch = (searchStr: string): bigint | undefined => {
  const value = new URLSearchParams(searchStr).get('b')
  return value !== null && /^[1-9]\d*$/.test(value) ? BigInt(value) : undefined
}

export const lastReadBlock = (state: LogState): bigint => state.nextBlock - 1n

export const isComparable = (gameBlock: bigint, state: LogState): boolean =>
  gameBlock >= lastReadBlock(state)
