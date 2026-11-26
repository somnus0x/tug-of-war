import type { GameLog, LogSide, PullLog } from '@/contracts/logs'
import type { Bps } from '@/lib/units'
import type { Address } from 'viem'

import { compareLogs, isPullLog } from '@/contracts/logs'
import { mulBps } from '@/lib/units'

export type WalletRecord = {
  readonly address: Address
  readonly team: LogSide
  readonly bnb: bigint
  readonly pull: bigint
  readonly firstSeen: number
  readonly isCaptain: boolean
}

export type PullEntry = {
  readonly log: PullLog
  readonly pull: bigint
  readonly weightBps: number
}

const accountKey = (address: string): string => address.toLowerCase()

const positionKey = (log: GameLog): string => `${log.blockNumber}:${log.logIndex}`

export const uniqueLogs = (logs: readonly GameLog[]): GameLog[] => {
  const seen = new Set<string>()
  return logs.toSorted(compareLogs).filter((log) => {
    const key = positionKey(log)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export const pullEntries = (logs: readonly GameLog[], startWeightBps: Bps): PullEntry[] => {
  return uniqueLogs(logs)
    .filter(isPullLog)
    .map((log) =>
      log.kind === 'contributed'
        ? { log, pull: log.pull, weightBps: log.weightBps }
        : { log, pull: mulBps(log.amount, startWeightBps), weightBps: startWeightBps },
    )
}

export const foldLogs = (logs: readonly GameLog[], startWeightBps: Bps): WalletRecord[] => {
  const byWallet = new Map<string, WalletRecord>()
  for (const { log, pull } of pullEntries(logs, startWeightBps)) {
    const key = accountKey(log.account)
    const known = byWallet.get(key)
    byWallet.set(
      key,
      known === undefined
        ? {
            address: log.account,
            team: log.team,
            bnb: log.amount,
            pull,
            firstSeen: byWallet.size,
            isCaptain: log.kind === 'captainDeposited',
          }
        : {
            ...known,
            bnb: known.bnb + log.amount,
            pull: known.pull + pull,
            isCaptain: known.isCaptain || log.kind === 'captainDeposited',
          },
    )
  }
  return [...byWallet.values()].toSorted((a, b) => a.firstSeen - b.firstSeen)
}
