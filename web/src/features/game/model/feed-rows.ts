import type { GameLog, LogSide } from '@/contracts/logs'
import type { Bps } from '@/lib/units'
import type { Address } from 'viem'

import { blockKey } from '@/contracts/logs'
import { FEED_COPY } from '@/copy/feed'
import { GAME_COPY } from '@/copy/game'
import {
  formatAgo,
  formatBnb,
  formatCount,
  formatPull,
  formatWeight,
  shortAddress,
} from '@/lib/format'
import { bnbWei, bps, pullWei } from '@/lib/units'

import { pullEntries, uniqueLogs } from './fold-logs'

export const FEED_ROWS = { desktop: 8, phone: 6 } as const

type Leader = LogSide | 'none'

export type FeedRow = {
  readonly id: string
  readonly team: LogSide
  readonly address: Address
  readonly me: boolean
  readonly bnb: bigint
  readonly weightBps: number
  readonly pull: bigint
  readonly leadChange: boolean
  readonly overtimeSeconds: number | null
  readonly at: number | null
}

export type FeedInput = {
  readonly logs: readonly GameLog[]
  readonly times: Readonly<Record<string, number>>
  readonly startWeightBps: Bps
  readonly overtimeExtension: number
  readonly account: Address | undefined
  readonly limit: number
}

const leaderOf = (blue: bigint, red: bigint): Leader => {
  if (blue === red) {
    return 'none'
  }
  return blue > red ? 'blue' : 'red'
}

const extendedPulls = (logs: readonly GameLog[]): ReadonlySet<string> => {
  const extended = new Set<string>()
  let previous: string | null = null
  for (const log of uniqueLogs(logs)) {
    if (log.kind !== 'overtime') {
      previous = log.id
    } else if (previous !== null) {
      extended.add(previous)
    }
  }
  return extended
}

export const feedRows = (input: FeedInput): FeedRow[] => {
  const extended = extendedPulls(input.logs)
  const totals = { blue: 0n, red: 0n }
  const me = input.account?.toLowerCase()
  const rows = pullEntries(input.logs, input.startWeightBps).map(({ log, pull, weightBps }) => {
    const before = leaderOf(totals.blue, totals.red)
    totals[log.team] += pull
    return {
      id: log.id,
      team: log.team,
      address: log.account,
      me: me !== undefined && log.account.toLowerCase() === me,
      bnb: log.amount,
      weightBps,
      pull,
      leadChange: log.kind === 'contributed' && before !== leaderOf(totals.blue, totals.red),
      overtimeSeconds: extended.has(log.id) ? input.overtimeExtension : null,
      at: input.times[blockKey(log.blockNumber)] ?? null,
    }
  })
  return rows.toReversed().slice(0, input.limit)
}

export type FeedRowText = {
  readonly who: string
  readonly team: string
  readonly calc: string
  readonly added: string
  readonly ago: string | null
  readonly leadChange: string | null
  readonly overtime: string | null
}

export const feedRowText = (row: FeedRow, now: number | null): FeedRowText => ({
  who: row.me ? FEED_COPY.you : shortAddress(row.address),
  team: GAME_COPY.team[row.team],
  calc: FEED_COPY.calc(formatBnb(bnbWei(row.bnb)), formatWeight(bps(row.weightBps))),
  added: FEED_COPY.added(formatPull(pullWei(row.pull))),
  ago: row.at === null || now === null ? null : formatAgo(now - row.at),
  leadChange: row.leadChange ? FEED_COPY.leadChange : null,
  overtime:
    row.overtimeSeconds === null ? null : FEED_COPY.overtime(formatCount(row.overtimeSeconds)),
})
