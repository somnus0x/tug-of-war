import type { GameLog, LogBatch, LogRequest } from './logs'
import type { Address } from 'viem'

export type LogClient = {
  readonly latestBlock: () => Promise<bigint>
  readonly blockTime: (blockNumber: bigint) => Promise<number>
  readonly logsIn: (launcher: Address, fromBlock: bigint, toBlock: bigint) => Promise<GameLog[]>
}

export type StartBlockStore = {
  readonly get: (key: string) => bigint | undefined
  readonly set: (key: string, block: bigint) => void
}

export const LOG_WINDOW_MAX = 5000n
export const LOG_WINDOW_MIN = 125n
export const WINDOWS_PER_READ = 24
export const RETRIES_PER_WINDOW = 2
export const BACKOFF_MS = 600
export const GROW_AFTER = 3

export type LogErrorKind = 'range' | 'rate' | 'head' | 'transient'

export type ChainLogReader = {
  readonly readLogs: (launcher: Address, request: LogRequest) => Promise<LogBatch>
  readonly readBlockTimes: (blocks: readonly bigint[]) => Promise<Readonly<Record<string, number>>>
  readonly windowSize: () => bigint
}

export type ReaderOptions = {
  readonly sleep?: (ms: number) => Promise<void>
}

const HEAD_ERROR =
  /beyond (?:the )?(?:current )?head|header not found|unknown block|block not found|future block/i
const RATE_ERROR = /rate.?limit|too many requests|\b429\b|throttl|capacity|try again later/i
const RANGE_ERROR =
  /block range|range (?:is )?too (?:large|wide|big)|exceed(?:s|ed)? (?:the )?max(?:imum)?|more than \d+ (?:results|logs|blocks)|too many (?:results|logs)|limit exceeded|response size|query timeout/i

const messageOf = (error: unknown): string => {
  if (error instanceof Error) {
    const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
    return `${error.message} ${details} ${messageOf(error.cause)}`
  }
  return typeof error === 'string' ? error : ''
}

export const classifyLogError = (error: unknown): LogErrorKind => {
  const message = messageOf(error)
  if (HEAD_ERROR.test(message)) return 'head'
  if (RATE_ERROR.test(message)) return 'rate'
  if (RANGE_ERROR.test(message)) return 'range'
  return 'transient'
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

export const findBlockAtOrAfter = async (
  client: LogClient,
  timestamp: number,
  latest: bigint,
  low = 0n,
): Promise<bigint> => {
  if (low >= latest) {
    return low
  }
  const middle = (low + latest) / 2n
  return (await client.blockTime(middle)) < timestamp
    ? findBlockAtOrAfter(client, timestamp, latest, middle + 1n)
    : findBlockAtOrAfter(client, timestamp, middle, low)
}

const minBig = (a: bigint, b: bigint): bigint => (a < b ? a : b)

const maxBig = (a: bigint, b: bigint): bigint => (a > b ? a : b)

type Page = { readonly logs: GameLog[]; readonly to: bigint }

type Stop = { readonly stop: LogErrorKind; readonly error: unknown }

type Progress = { readonly logs: GameLog[]; readonly cursor: bigint; readonly stopped: Stop | null }

export const createChainLogReader = (
  client: LogClient,
  store: StartBlockStore,
  chainId: number,
  options: ReaderOptions = {},
): ChainLogReader => {
  const sleep = options.sleep ?? wait
  let window = LOG_WINDOW_MAX
  let successes = 0

  const grow = (): void => {
    successes += 1
    if (successes >= GROW_AFTER && window < LOG_WINDOW_MAX) {
      window = minBig(window * 2n, LOG_WINDOW_MAX)
      successes = 0
    }
  }

  const isUsableHint = async (
    hint: bigint | undefined,
    request: LogRequest,
    latest: bigint,
  ): Promise<boolean> =>
    hint !== undefined && hint <= latest && (await client.blockTime(hint)) <= request.createdAt

  const startBlock = async (
    launcher: Address,
    request: LogRequest,
    latest: bigint,
  ): Promise<bigint> => {
    if (
      request.startHint !== undefined &&
      (await isUsableHint(request.startHint, request, latest))
    ) {
      return request.startHint
    }
    const key = `tug-of-war:start-block:${chainId}:${launcher.toLowerCase()}`
    const cached = store.get(key)
    if (cached !== undefined && cached <= latest) {
      return cached
    }
    const found = await findBlockAtOrAfter(client, request.createdAt, latest)
    store.set(key, found)
    return found
  }

  const readWindow = async (
    launcher: Address,
    from: bigint,
    latest: bigint,
    retries: number,
    span: bigint = window,
  ): Promise<Page | Stop> => {
    const to = minBig(from + span - 1n, latest)
    const queried = to - from + 1n
    try {
      const logs = await client.logsIn(launcher, from, to)
      grow()
      return { logs, to }
    } catch (error) {
      const kind = classifyLogError(error)
      if (kind === 'range') {
        successes = 0
        if (queried <= LOG_WINDOW_MIN) {
          return { stop: kind, error }
        }
        const half = maxBig(queried / 2n, LOG_WINDOW_MIN)
        window = minBig(window, half)
        return readWindow(launcher, from, latest, retries, half)
      }
      if ((kind === 'rate' || kind === 'transient') && retries < RETRIES_PER_WINDOW) {
        await sleep(BACKOFF_MS * 2 ** retries)
        return readWindow(launcher, from, latest, retries + 1, span)
      }
      return { stop: kind, error }
    }
  }

  const readFrom = async (
    launcher: Address,
    cursor: bigint,
    latest: bigint,
    reads: number,
  ): Promise<Progress> => {
    if (reads >= WINDOWS_PER_READ || cursor > latest) {
      return { logs: [], cursor, stopped: null }
    }
    const page = await readWindow(launcher, cursor, latest, 0)
    if ('stop' in page) {
      return { logs: [], cursor, stopped: page }
    }
    const rest = await readFrom(launcher, page.to + 1n, latest, reads + 1)
    return { ...rest, logs: [...page.logs, ...rest.logs] }
  }

  return {
    readLogs: async (launcher, request) => {
      const latest = await client.latestBlock()
      const from = request.fromBlock ?? (await startBlock(launcher, request, latest))
      const { logs, cursor, stopped } = await readFrom(launcher, from, latest, 0)
      if (stopped !== null && stopped.stop !== 'head' && cursor === from) {
        throw stopped.error
      }
      return {
        logs,
        fromBlock: from,
        toBlock: cursor - 1n,
        caughtUp: stopped === null && cursor > latest,
        hasMore: stopped === null && cursor <= latest,
        times: {},
      }
    },
    readBlockTimes: async (blocks) => {
      const entries = await Promise.all(
        blocks.map(async (block) => [block.toString(), await client.blockTime(block)] as const),
      )
      return Object.fromEntries(entries)
    },
    windowSize: () => window,
  }
}

export const sessionStartBlocks: StartBlockStore = {
  get: (key) => {
    try {
      const value = globalThis.sessionStorage.getItem(key)
      return value === null || !/^\d+$/.test(value) ? undefined : BigInt(value)
    } catch {
      return undefined
    }
  },
  set: (key, block) => {
    try {
      globalThis.sessionStorage.setItem(key, block.toString())
    } catch {
      return
    }
  },
}
