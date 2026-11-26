import type { GameLog, LogBatch, LogRequest } from '../logs'
import type { SourceScope } from '../types'
import type { OverlayPull } from './overlay'
import type { FixtureWorld } from './world'
import type { Address, Hash } from 'viem'

import { keccak256, toHex } from 'viem'

import { bnbWei, bps, pullWei } from '@/lib/units'

import { blockKey, logId } from '../logs'

type Ledger = {
  served: bigint
  readonly blocks: bigint[]
}

const pullLogs = (pull: OverlayPull, txHash: Hash, blockNumber: bigint): GameLog[] => {
  const position = { id: logId(txHash, 0), txHash, blockNumber, logIndex: 0 }
  const amount = bnbWei(pull.amount)
  const main: GameLog = pull.captain
    ? { ...position, kind: 'captainDeposited', account: pull.account, team: pull.team, amount }
    : {
        ...position,
        kind: 'contributed',
        account: pull.account,
        team: pull.team,
        amount,
        pull: pullWei(pull.pull),
        weightBps: bps(pull.weightBps),
      }
  if (pull.extensionsUsed === null) {
    return [main]
  }
  return [
    main,
    {
      id: logId(txHash, 1),
      txHash,
      blockNumber,
      logIndex: 1,
      kind: 'overtime',
      extensionsUsed: pull.extensionsUsed,
    },
  ]
}

const maxBig = (...values: bigint[]): bigint =>
  values.reduce((top, value) => (value > top ? value : top))

export const createFixtureLogs = (world: FixtureWorld) => {
  const ledgers = new Map<string, Ledger>()

  const ledgerOf = (key: string, start: bigint): Ledger => {
    const known = ledgers.get(key)
    if (known !== undefined) {
      return known
    }
    const fresh: Ledger = { served: start, blocks: [] }
    ledgers.set(key, fresh)
    return fresh
  }

  const sync = (launcher: Address, scope: SourceScope) => {
    const history = world.history(launcher, scope)
    const key = world.overlayKey(launcher, scope)
    const pulls = world.overlay(launcher, scope).pulls
    const now = BigInt(world.now())
    const ledger = ledgerOf(key, maxBig(history.lastBlock, now))
    const times: Record<string, number> = { ...history.times }
    const extra = pulls.flatMap((pull, index) => {
      let block = ledger.blocks[index]
      if (block === undefined) {
        block = maxBig(BigInt(pull.at), ledger.served + 1n, ...ledger.blocks.map((b) => b + 1n))
        ledger.blocks[index] = block
      }
      times[blockKey(block)] = pull.at
      return pullLogs(pull, keccak256(toHex(`${key}:pull:${index}`)), block)
    })
    const latest = maxBig(now, ledger.served, ...ledger.blocks)
    ledger.served = latest
    return { logs: [...history.logs, ...extra], times, latest }
  }

  return {
    headBlock: (launcher: Address, scope: SourceScope): bigint => sync(launcher, scope).latest,
    readLogs: (launcher: Address, request: LogRequest, scope: SourceScope): LogBatch => {
      const { logs, times, latest } = sync(launcher, scope)
      const from = request.fromBlock ?? 0n
      return {
        logs: logs.filter((log) => log.blockNumber >= from && log.blockNumber <= latest),
        fromBlock: from,
        toBlock: latest,
        caughtUp: true,
        hasMore: false,
        times,
      }
    },
  }
}
